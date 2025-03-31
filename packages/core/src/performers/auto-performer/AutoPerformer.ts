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
import { LoggerMessageColor } from "@/types/logger";
import {
  extractAutoPilotReviewOutputs,
  extractAutoPilotStepOutputs,
} from "@/common/extract/extractTaggedOutputs";
import { parseFormattedText } from "./reviews/format-utils";
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

  private extractReviewOutput(text: string): AutoReviewSection | null {
    const { summary, findings, score } = extractAutoPilotReviewOutputs(text);

    if (!summary) {
      return null;
    }

    return {
      summary,
      findings: findings
        ? findings
            .split("\n")
            .map((finding: string) => finding.replace(/^- /, "").trim())
        : undefined,
      score,
    };
  }

  private logReviewSection(
    review: AutoReviewSection,
    typeObject: AutoReviewSectionConfig,
  ) {
    const summaryMessage = review.score
      ? `${review.summary} (Score: ${review.score})`
      : review.summary;

    const formattedSummary = parseFormattedText(summaryMessage);

    logger
      .labeled(`${typeObject.title.toUpperCase()} REVIEW`)
      .info(...formattedSummary);

    review.findings?.forEach((finding) => {
      const formattedFinding = parseFormattedText(`- ${finding}`);
      logger.info(...formattedFinding);
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
      const cacheResult = await this.getValueFromCache(
        cacheKey,
        screenCapture,
        reviewSectionTypes,
      );
      if (cacheResult) {
        return cacheResult;
      }
    }

    const analysisProgress = logger.startProgress(
      {
        actionLabel: "ANALYZE",
        successLabel: "READY",
        failureLabel: "FAILED",
      },
      {
        message: "Analyzing current screen content and structure",
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

        // These fields are required according to the extractor, so we can safely assert they exist
        const thoughts = outputs.thoughts as string;
        lastScreenDescription = outputs.screenDescription as string;
        lastAction = outputs.action as string;
        const plan: AutoStepPlan = { action: lastAction, thoughts };
        const goalAchieved = !!outputs.goalSummary;

        analysisProgress.stop("success", {
          message: "Screen analysis complete, next action determined",
          isBold: true,
          color: "green",
        });

        // Log thoughts with formatted text
        const formattedThoughts = parseFormattedText(thoughts as string);
        logger.labeled("THOUGHTS").info(...formattedThoughts);

        const review: AutoReview = {};

        if (reviewSectionTypes && reviewSectionTypes.length > 0) {
          reviewSectionTypes.forEach((reviewType) => {
            const reviewContent = outputs[reviewType.title];
            if (reviewContent) {
              const extractedReview = this.extractReviewOutput(reviewContent);
              if (extractedReview) {
                review[reviewType.title] = extractedReview;
              }
            }
          });
        }

        const hasReviews = Object.keys(review).length > 0;

        if (hasReviews) {
          this.logReviews(lastScreenDescription, review, reviewSectionTypes);
        }

        const summary = outputs.goalSummary;

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
        logger
          .labeled("ERROR")
          .error(
            `Analysis attempt ${attempt}/${maxAttempts} failed: ${errorMessage}`,
          );

        if (attempt < maxAttempts) {
          logger.labeled("RETRYING").warn("Initiating new analysis attempt");

          previousSteps = [
            ...previousSteps,
            {
              screenDescription: lastScreenDescription,
              step: lastAction,
              error: errorMessage,
            },
          ];
        } else {
          analysisProgress.stop(
            "failure",
            `Screen analysis failed: ${errorMessage}`,
          );
          throw lastError;
        }
      }
    }
    throw new Error("Analysis failed to reach a decision");
  }

  async perform(
    goal: string,
    reviewSectionTypes?: AutoReviewSectionConfig[],
  ): Promise<AutoReport> {
    const maxSteps = 100;
    const previousSteps: AutoPreviousStep[] = [];
    const pilotSteps: PreviousStep[] = [];
    const report: AutoReport = { goal, steps: [] };

    // Create the overall goal progress with minimal labels
    const mainProgress = logger.startProgress(
      {
        actionLabel: "GOAL",
        successLabel: "DONE",
        failureLabel: "FAILED",
      },
      {
        message: goal,
        isBold: true,
        color: "whiteBright",
      },
    );

    for (let step = 0; step < maxSteps; step++) {
      // Capture the screen silently (without separate logging)
      const screenCaptureWithoutHighlight =
        await this.screenCapturer.capture(false);

      // Analyze the screen and plan the next step
      const stepReport = await this.analyseScreenAndCreatePilotStep(
        goal,
        [...previousSteps],
        screenCaptureWithoutHighlight,
        reviewSectionTypes ? reviewSectionTypes : undefined,
      );

      if (stepReport.goalAchieved) {
        report.summary = stepReport.summary;
        report.review = stepReport.review;

        // Format summary with our formatting parser if available
        const formattedSummary = report.summary
          ? parseFormattedText(report.summary)
          : [
              {
                message: "Goal completed successfully",
                isBold: false,
                color: "green" as LoggerMessageColor,
              },
            ];

        // Complete the main progress
        mainProgress.stop("success", {
          message: "Success",
          isBold: true,
          color: "green",
        });

        logger.labeled("SUMMARY").info(...formattedSummary);

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
      pilotSteps.push({ step: stepReport.plan.action, code, result });
      previousSteps.push({
        screenDescription: stepReport.screenDescription,
        step: stepReport.plan.action,
        review: stepReport.review,
      });

      if (step === maxSteps - 1) {
        mainProgress.stop("warn", {
          message: "Limit reached",
          isBold: true,
          color: "yellow",
        });
      }
    }

    return report;
  }

  private logReviews(
    screenDescription: string,
    review: AutoReview,
    reviewSectionTypes?: AutoReviewSectionConfig[],
  ): void {
    const formattedDescription = parseFormattedText(screenDescription);
    logger.labeled("REVIEWING").info(...formattedDescription);

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

  private async getValueFromCache(
    cacheKey: string,
    screenCapture: ScreenCapturerResult,
    reviewSectionTypes?: AutoReviewSectionConfig[],
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

    const cachedReport = matchingEntry?.value as AutoStepReport;

    if (cachedReport && cachedReport.plan && cachedReport.plan.thoughts) {
      logger.labeled("CACHE").info("Using cached analysis result");

      const formattedThoughts = parseFormattedText(cachedReport.plan.thoughts);
      logger.labeled("THOUGHTS").info(...formattedThoughts);

      const hasReviews =
        cachedReport.review && Object.keys(cachedReport.review).length > 0;
      if (hasReviews && reviewSectionTypes && cachedReport.review) {
        this.logReviews(
          cachedReport.screenDescription,
          cachedReport.review,
          reviewSectionTypes,
        );
      }
    }

    return cachedReport;
  }
}
