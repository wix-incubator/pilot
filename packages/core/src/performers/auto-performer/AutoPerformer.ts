import { AutoPerformerPromptCreator } from "./AutoPerformerPromptCreator";
import {
  AutoPreviousStep,
  AutoReport,
  AutoReview,
  AutoReviewSection,
  AutoStepPlan,
  AutoStepReport,
  LoggerMessageColor,
  PreviousStep,
  PromptHandler,
  ScreenCapturerResult,
  SingleAutoPilotCacheValue,
} from "@/types";
import {
  extractTaggedOutputs,
  OUTPUTS_MAPPINGS,
} from "@/common/extract/extractTaggedOutputs";
import { StepPerformer } from "@/performers/step-performer/StepPerformer";
import { ScreenCapturer } from "@/common/snapshot/ScreenCapturer";
import logger from "@/common/logger";
import { CacheHandler } from "@/common/cacheHandler/CacheHandler";
import { SnapshotComparator } from "@/common/snapshot/comparator/SnapshotComparator";

export class AutoPerformer {
  constructor(
    private promptCreator: AutoPerformerPromptCreator,
    private stepPerformer: StepPerformer,
    private promptHandler: PromptHandler,
    private screenCapturer: ScreenCapturer,
    private cacheHandler: CacheHandler,
    private snapshotComparator: SnapshotComparator,
  ) {}

  private extractReviewOutput(text: string): AutoReviewSection {
    const { summary, findings, score } = extractTaggedOutputs({
      text,
      outputsMapper: OUTPUTS_MAPPINGS.PILOT_REVIEW_SECTION,
    });

    return {
      summary,
      findings: findings
        ?.split("\n")
        .map((finding: string) => finding.replace(/^- /, "").trim()),
      score,
    };
  }

  private logReviewSection(
    review: AutoReviewSection,
    type: "ux" | "a11y" | "i18n",
  ) {
    const config: {
      [key: string]: {
        emoji: string;
        color: LoggerMessageColor;
        findingColor: LoggerMessageColor;
      };
    } = {
      ux: {
        emoji: "🎨",
        color: "magentaBright",
        findingColor: "magenta",
      },
      a11y: {
        emoji: "👁️ ",
        color: "yellowBright",
        findingColor: "yellow",
      },
      i18n: {
        emoji: "🌐",
        color: "cyanBright",
        findingColor: "cyan",
      },
    };

    logger.info({
      message: `📝${config[type].emoji} Pilot ${type.toUpperCase()} review: ${review?.summary} (Score: ${review?.score})`,
      isBold: true,
      color: config[type].color,
    });

    review.findings?.forEach((finding) => {
      logger.info({
        message: `🔍 ${finding}`,
        isBold: false,
        color: config[type].findingColor,
      });
    });
  }

  private generateCacheKey(
    goal: string,
    previous: AutoPreviousStep[],
  ): string | undefined {
    return this.cacheHandler.generateCacheKey<AutoPreviousStep>(
      goal,
      previous,
      {
        keyName: "currentStep",
        previousKeyName: "previousSteps",
        mapFn: (step) => ({
          screenDescription: step.screenDescription,
          step: step.step,
          hasReview: !!step.review,
        }),
      },
    );
  }

  async analyseScreenAndCreatePilotStep(
    goal: string,
    previousSteps: AutoPreviousStep[],
    screenCapture: ScreenCapturerResult,
  ): Promise<AutoStepReport> {
    const cacheKey = this.generateCacheKey(goal, previousSteps);

    // Check cache first
    if (this.cacheHandler.isCacheInUse() && cacheKey) {
      const cacheResult = await this.getValueFromCache(cacheKey, screenCapture);
      if (cacheResult !== undefined) {
        return {
          screenDescription: cacheResult.screenDescription,
          plan: cacheResult.plan,
          review: cacheResult.review,
          goalAchieved: cacheResult.goalAchieved,
          summary: cacheResult.summary,
        };
      }
    }

    const analysisLoggerSpinner = logger.startSpinner(
      "🤔 Thinking on next step",
      {
        message: goal,
        isBold: true,
        color: "whiteBright",
      },
    );

    try {
      const { snapshot, viewHierarchy, isSnapshotImageAttached } =
        screenCapture;

      const prompt = this.promptCreator.createPrompt(
        goal,
        viewHierarchy,
        isSnapshotImageAttached,
        previousSteps,
      );

      const promptResult = await this.promptHandler.runPrompt(prompt, snapshot);
      const outputs = extractTaggedOutputs({
        text: promptResult,
        outputsMapper: OUTPUTS_MAPPINGS.PILOT_STEP,
      });

      const { screenDescription, thoughts, action, ux, a11y, i18n } = outputs;
      const plan: AutoStepPlan = { action, thoughts };
      const goalAchieved = action === "success";

      analysisLoggerSpinner.stop("success", "💡 Next step ready", {
        message: plan.action,
        isBold: true,
        color: "whiteBright",
      });

      logger.info({
        message: `🤔 Thoughts: ${thoughts}`,
        isBold: false,
        color: "grey",
      });

      const review: AutoReview = {
        ux: ux ? this.extractReviewOutput(ux) : undefined,
        a11y: a11y ? this.extractReviewOutput(a11y) : undefined,
        i18n: i18n ? this.extractReviewOutput(i18n) : undefined,
      };

      if (review.ux || review.a11y || review.i18n) {
        logger.info({
          message: `Conducting review for ${screenDescription}\n`,
          isBold: true,
          color: "whiteBright",
        });

        review.ux && this.logReviewSection(review.ux, "ux");
        review.a11y && this.logReviewSection(review.a11y, "a11y");
        review.i18n && this.logReviewSection(review.i18n, "i18n");
      }

      const summary = goalAchieved
        ? extractTaggedOutputs({
            text: thoughts,
            outputsMapper: OUTPUTS_MAPPINGS.PILOT_SUMMARY,
          }).summary
        : undefined;

      const stepReport = {
        screenDescription,
        plan,
        review,
        goalAchieved,
        summary,
      };

      if (this.cacheHandler.isCacheInUse() && cacheKey) {
        const cacheValue = await this.generateCacheValue(
          screenCapture,
          screenDescription,
          plan,
          review,
          goalAchieved,
          summary,
        );
        this.cacheHandler.addToTemporaryCache(cacheKey, cacheValue);
      }

      return stepReport;
    } catch (error) {
      analysisLoggerSpinner.stop(
        "failure",
        `😓 Pilot encountered an error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async perform(goal: string): Promise<AutoReport> {
    const maxSteps = 100;
    let previousSteps: AutoPreviousStep[] = [];
    let pilotSteps: PreviousStep[] = [];
    const report: AutoReport = { goal, steps: [] };

    this.cacheHandler.loadCacheFromFile();

    logger.info(
      {
        message: `🛫 Pilot is about to reach goal:\n`,
        isBold: false,
        color: "cyan",
      },
      {
        message: goal,
        isBold: true,
        color: "cyanBright",
      },
    );

    for (let step = 0; step < maxSteps; step++) {
      const screenCapture = await this.screenCapturer.capture();
      const stepReport = await this.analyseScreenAndCreatePilotStep(
        goal,
        [...previousSteps],
        screenCapture,
      );

      if (stepReport.goalAchieved) {
        report.summary = stepReport.summary;
        report.review = stepReport.review;

        logger.info(`🛬 Pilot reached goal: "${goal}"! 🎉 Summarizing:\n`, {
          message: `${stepReport.summary}`,
          isBold: true,
          color: "whiteBright",
        });
        logger.writeLogsToFile(`pilot_logs_${Date.now()}`);
        break;
      }

      const { code, result } = await this.stepPerformer.perform(
        stepReport.plan.action,
        [...pilotSteps],
        screenCapture,
      );

      report.steps.push({ code, ...stepReport });

      pilotSteps = [
        ...pilotSteps,
        { step: stepReport.plan.action, code, result },
      ];

      previousSteps = [
        ...previousSteps,
        {
          screenDescription: stepReport.screenDescription,
          step: stepReport.plan.action,
          review: stepReport.review,
        },
      ];

      if (step === maxSteps - 1) {
        logger.warn(
          `🚨 Pilot reached the maximum number of steps (${maxSteps}) without reaching the goal.`,
        );
      }
    }

    return report;
  }

  private async generateCacheValue(
    screenCapture: ScreenCapturerResult,
    screenDescription: string,
    plan: AutoStepPlan,
    review: AutoReview,
    goalAchieved: boolean,
    summary?: string,
  ): Promise<SingleAutoPilotCacheValue | undefined> {
    if (!this.cacheHandler.isCacheInUse()) {
      throw new Error("Cache is disabled");
    }

    const { viewHierarchyHash, snapshotHash } =
      await this.cacheHandler.generateCacheHashes(
        screenCapture.viewHierarchy,
        screenCapture.snapshot,
        this.snapshotComparator,
      );

    return {
      viewHierarchyHash,
      snapshotHash,
      screenDescription,
      plan,
      review,
      goalAchieved,
      summary,
    };
  }

  private async getValueFromCache(
    cacheKey: string,
    screenCapture: ScreenCapturerResult,
  ): Promise<SingleAutoPilotCacheValue | undefined> {
    if (!this.cacheHandler.isCacheInUse() || !cacheKey) {
      return undefined;
    }

    const cachedValues = this.cacheHandler.getStepFromCache(cacheKey);
    if (!cachedValues) {
      return undefined;
    }

    return await this.cacheHandler.findInCache<SingleAutoPilotCacheValue>(
      cachedValues as SingleAutoPilotCacheValue[],
      screenCapture.viewHierarchy,
      screenCapture.snapshot,
      this.snapshotComparator,
    );
  }
}
