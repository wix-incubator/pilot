import { AutoPerformerPromptCreator } from "./AutoPerformerPromptCreator";
import {
  AutoPerformerCacheValue,
  AutoPreviousStep,
  AutoReport,
  AutoReview,
  AutoReviewSection,
  AutoStepPlan,
  AutoStepReport,
} from "@/types/auto";
import {
  LoggerMessageColor,
  PreviousStep,
  PromptHandler,
  ScreenCapturerResult,
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

  async analyseScreenAndCreatePilotStep(
    goal: string,
    previousSteps: AutoPreviousStep[],
    screenCapture: ScreenCapturerResult,
    maxAttempts: number = 2,
  ): Promise<AutoStepReport> {
    const cacheKey = this.cacheHandler.generateCacheKey({
      goal,
      previousSteps,
    });

    if (this.cacheHandler.isCacheInUse() && cacheKey) {
      const cacheResult = await this.getValueFromCache(cacheKey, screenCapture);
      if (cacheResult) {
        return cacheResult;
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

    const lastError: any = null;
    let lastScreenDescription = "";
    let lastAction = "";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const prompt = this.promptCreator.createPrompt(
          goal,
          screenCapture.viewHierarchy ?? "Unknown view hierarchy",
          !!screenCapture.snapshot,
          previousSteps,
        );

        const promptResult = await this.promptHandler.runPrompt(
          prompt,
          screenCapture.snapshot,
        );

        const outputs = extractTaggedOutputs({
          text: promptResult,
          outputsMapper: OUTPUTS_MAPPINGS.PILOT_STEP,
        });

        const { thoughts, ux, a11y, i18n } = outputs;
        lastScreenDescription = outputs.screenDescription;
        lastAction = outputs.action;
        const plan: AutoStepPlan = { action: lastAction, thoughts };
        const goalAchieved = lastAction === "success";

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
            message: `Conducting review for ${lastScreenDescription}\n`,
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

        if (this.cacheHandler.isCacheInUse() && cacheKey) {
          const snapshotHashes =
            await this.cacheHandler.generateHashes(screenCapture);

          const cacheValue: AutoPerformerCacheValue = {
            screenDescription: lastScreenDescription,
            plan,
            review,
            goalAchieved,
            summary,
          };

          this.cacheHandler.addToTemporaryCache(
            cacheKey,
            cacheValue,
            snapshotHashes,
          );
        }

        return {
          screenDescription: lastScreenDescription,
          plan,
          review,
          goalAchieved,
          summary,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : error;
        logger.warn(
          `💥 Auto-Pilot attempt ${attempt}/${maxAttempts} failed: ${errorMessage}`,
        );

        if (attempt < maxAttempts) {
          logger.info(`Auto-Pilot retrying...`);

          previousSteps = [
            ...previousSteps,
            {
              screenDescription: lastScreenDescription,
              step: lastAction,
              error: errorMessage,
            },
          ];
        } else {
          analysisLoggerSpinner.stop(
            "failure",
            `😓 Auto-Pilot encountered an error: ${errorMessage}`,
          );
          throw lastError;
        }
      }
    }
    throw new Error("Auto-Pilot failed to reach a decision");
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
      const screenCaptureWithoutHighlight =
        await this.screenCapturer.capture(false);
      const stepReport = await this.analyseScreenAndCreatePilotStep(
        goal,
        [...previousSteps],
        screenCaptureWithoutHighlight,
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

      const screenCaptureWithHighlight =
        await this.screenCapturer.capture(true);
      const { code, result } = await this.stepPerformer.perform(
        stepReport.plan.action,
        [...pilotSteps],
        screenCaptureWithHighlight,
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

  private async getValueFromCache(
    cacheKey: string,
    screenCapture: ScreenCapturerResult,
  ): Promise<AutoStepReport | undefined> {
    const cachedValues =
      this.cacheHandler.getFromPersistentCache<AutoPerformerCacheValue>(
        cacheKey,
      );
    if (!cachedValues) {
      return undefined;
    }

    const snapshotHashes =
      await this.snapshotComparator.generateHashes(screenCapture);

    const matchingEntry =
      this.cacheHandler.findMatchingCacheEntry<AutoPerformerCacheValue>(
        cachedValues,
        snapshotHashes,
      );

    if (matchingEntry) {
      const value = matchingEntry.value;
      return {
        screenDescription: value.screenDescription,
        plan: value.plan,
        review: value.review,
        goalAchieved: value.goalAchieved,
        summary: value.summary,
      };
    }

    return undefined;
  }
}
