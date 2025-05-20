import { StepPerformerPromptCreator } from "./StepPerformerPromptCreator";
import { CodeEvaluator } from "@/common/CodeEvaluator";
import { CacheHandler } from "@/common/cacheHandler/CacheHandler";
import { SnapshotComparator } from "@/common/snapshot/comparator/SnapshotComparator";
import {
  CodeEvaluationResult,
  PreviousStep,
  PromptHandler,
  ScreenCapturerResult,
  StepPerformerCacheValue,
} from "@/types";
import { extractPilotOutputs } from "@/common/extract/extractTaggedOutputs";
import { ScreenCapturer } from "@/common/snapshot/ScreenCapturer";
import logger from "@/common/logger";

export class StepPerformer {
  private sharedContext: Record<string, any> = {};

  constructor(
    private context: any,
    private promptCreator: StepPerformerPromptCreator,
    private codeEvaluator: CodeEvaluator,
    private promptHandler: PromptHandler,
    private cacheHandler: CacheHandler,
    private snapshotComparator: SnapshotComparator,
    private screenCapturer: ScreenCapturer,
  ) {}

  extendJSContext(newContext: any): void {
    for (const key in newContext) {
      if (key in this.context) {
        logger
          .labeled("WARNING")
          .warn(
            `Pilot's variable from context \`${key}\` is overridden by a new value from \`extendJSContext\``,
          );
        break;
      }
    }
    this.context = { ...this.context, ...newContext };
  }

  private async generateCode(
    currentStep: string,
    previousSteps: PreviousStep[],
    screenCapture: ScreenCapturerResult,
  ): Promise<string> {
    const cacheKey = this.cacheHandler.generateCacheKey({
      currentStep,
      previousSteps,
    });

    if (this.cacheHandler.isCacheInUse() && cacheKey) {
      const cachedValues =
        this.cacheHandler.getFromPersistentCache<StepPerformerCacheValue>(
          cacheKey,
        );
      if (cachedValues) {
        const matchingEntry =
          await this.cacheHandler.findMatchingCacheEntryValidationMatcherBased<StepPerformerCacheValue>(
            cachedValues,
            this.context,
            this.sharedContext,
          );

        if (matchingEntry) {
            logger
                .labeled("CACHE")
                .warn(
                    `Using cached value`,
                );
          return matchingEntry.value.code;
        }
      }
    }

    // No cache match found, generate new code
    const prompt = this.promptCreator.createPrompt(
      currentStep,
      screenCapture.viewHierarchy ?? "Unknown view hierarchy",
      !!screenCapture.snapshot,
      previousSteps,
    );

    const promptResult = await this.promptHandler.runPrompt(
      prompt,
      screenCapture.snapshot,
    );

    const extractedCodeBlock = extractPilotOutputs(promptResult);

    const code = extractedCodeBlock.code
      ? extractedCodeBlock.code
      : "No code found";

    const cacheValue: StepPerformerCacheValue = { code };
    if (this.cacheHandler.isCacheInUse() && cacheKey && extractedCodeBlock.cacheValidationMatcher) {
      this.cacheHandler.addToTemporaryCacheValidationMatcherBased(
        cacheKey,
        cacheValue,
        extractedCodeBlock.cacheValidationMatcher,
      );
    }
    else if (this.cacheHandler.isCacheInUse() && cacheKey){
        this.cacheHandler.addToTemporaryCacheValidationMatcherBased(
            cacheKey,
            cacheValue,
        );
    }
    return code;

  }

  async perform(
    step: string,
    previous: PreviousStep[] = [],
    screenCapture: ScreenCapturerResult,
    maxAttempts: number = 2,
  ): Promise<CodeEvaluationResult> {
    const progress = logger.startProgress(
      {
        actionLabel: "STEP",
        successLabel: "DONE",
        failureLabel: "FAIL",
      },
      {
        message: step,
        isBold: true,
        color: "whiteBright",
      },
    );
    let lastError: any = null;
    let lastCode: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const screenCaptureResult =
          attempt == 1
            ? screenCapture
            : await this.screenCapturer.capture(true);

        const generatedCode = await this.generateCode(
          step,
          previous,
          screenCaptureResult,
        );

        lastCode = generatedCode;

        if (!generatedCode) {
          progress.updateLabel("RETRY", {
            message: step,
            isBold: true,
            color: "yellow",
          });

          throw new Error(
            "Failed to generate code from intent, please retry generating the code or provide a code that throws a descriptive error.",
          );
        }

        let result: CodeEvaluationResult;
          result = await this.codeEvaluator.evaluate(
            generatedCode,
            this.context,
            this.sharedContext,
          );
          this.sharedContext = result.sharedContext || this.sharedContext;
        progress.stop("success", {
          message: "Step completed successfully",
          isBold: true,
          color: "green",
        });

        if (attempt > 1) {
          logger
            .labeled("SUCCESS")
            .info(
              `Attempt ${attempt}/${maxAttempts} succeeded for step "${step}"`,
            );
        }

        return result;
      } catch (error) {
        lastError = error;
        const errorDetails = error instanceof Error ? error.message : error;
        logger
          .labeled("ERROR")
          .error(
            `Attempt ${attempt}/${maxAttempts} failed for step: ${step}, with error: ${errorDetails}`,
          );

        if (attempt < maxAttempts) {
          progress.updateLabel("RETRY", "Trying again");

          previous = [
            ...previous,
            {
              step,
              code: lastCode ?? "undefined",
              error: errorDetails,
            },
          ];
        }
      }
    }

    progress.stop("failure", "Step failed after multiple attempts");
    throw lastError;
  }
}
