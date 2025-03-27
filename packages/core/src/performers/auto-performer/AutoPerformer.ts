import { AutoPerformerPromptCreator } from "./AutoPerformerPromptCreator";
import {
  AutoPerformerCacheValue,
  AutoPreviousStep,
  AutoReport,
  AutoReview,
  AutoReviewSection,
  AutoReviewSectionConfig,
  AutoStepPlan,
  AutoStepReport,
} from "@/types/auto";
import { PreviousStep, PromptHandler, ScreenCapturerResult } from "@/types";
import {
  extractAutoPilotReviewOutputs,
  extractAutoPilotStepOutputs,
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
    const { summary, findings, score } = extractAutoPilotReviewOutputs(text);

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
    typeObject: AutoReviewSectionConfig,
  ) {
    logger.info({
      message: `📝 Pilot ${typeObject.title.toUpperCase()} review: ${review?.summary} (Score: ${review?.score})`,
      isBold: true,
      color: "blueBright",
    });

    review.findings?.forEach((finding) => {
      logger.info({
        message: `🔍 ${finding}`,
        isBold: false,
        color: "blueBright",
      });
    });
  }

  async analyseScreenAndCreatePilotStep(
    goal: string,
    previousSteps: AutoPreviousStep[],
    screenCapture: ScreenCapturerResult,
    reviewSectionTypes?: AutoReviewSectionConfig[],
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
          reviewSectionTypes,
        );

        const promptResult = await this.promptHandler.runPrompt(
          prompt,
          screenCapture.snapshot,
        );

        const outputs = extractAutoPilotStepOutputs(
          promptResult,
          reviewSectionTypes,
        );

        const thoughts = outputs.thoughts;
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

        const review: AutoReview = {};

        if (reviewSectionTypes && reviewSectionTypes.length > 0) {
          reviewSectionTypes.forEach((reviewType) => {
            const reviewContent = outputs[reviewType.title];
            if (reviewContent) {
              review[reviewType.title] =
                this.extractReviewOutput(reviewContent);
            }
          });
        }

        const hasReviews = Object.keys(review).length > 0;

        if (hasReviews) {
          logger.info({
            message: `Conducting review for ${lastScreenDescription}\n`,
            isBold: true,
            color: "whiteBright",
          });

          Object.keys(review).forEach((reviewType) => {
            if (review[reviewType]) {
              const reviewTypeConfig = reviewSectionTypes?.find(
                (rt) => rt.title.toLowerCase() === reviewType.toLowerCase(),
              );
              if (reviewTypeConfig !== undefined)
                this.logReviewSection(review[reviewType], reviewTypeConfig);
            }
          });
        }

        const summary = goalAchieved ? outputs.goalSummary : undefined;

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

  async perform(
    goal: string,
    reviewSectionTypes?: AutoReviewSectionConfig[],
  ): Promise<AutoReport> {
    const maxSteps = 100;
    let previousSteps: AutoPreviousStep[] = [];
    let pilotSteps: PreviousStep[] = [];
    const report: AutoReport = { goal, steps: [] };

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
        reviewSectionTypes ? reviewSectionTypes : undefined,
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

    return matchingEntry?.value as AutoStepReport;
  }
}
