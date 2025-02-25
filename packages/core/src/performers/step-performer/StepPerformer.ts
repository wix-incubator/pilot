import { StepPerformerPromptCreator } from "./StepPerformerPromptCreator";
import { CodeEvaluator } from "@/common/CodeEvaluator";
import { APISearchPromptCreator } from "@/common/prompts/APISearchPromptCreator";
import { ViewAnalysisPromptCreator } from "@/common/prompts/ViewAnalysisPromptCreator";
import { StepPerformerCacheHandler } from "@/performers/step-performer/StepPerformerCacheHandler";
import { SnapshotComparator } from "@/common/snapshot/comparator/SnapshotComparator";
import {
  AnalysisMode,
  CacheMode,
  CodeEvaluationResult,
  PreviousStep,
  PromptHandler,
  ScreenCapturerResult,
  type CacheValues,
  type SingleCacheValue,
} from "@/types";
import * as crypto from "crypto";
import { extractCodeBlock } from "@/common/extract/extractCodeBlock";
import { ScreenCapturer } from "@/common/snapshot/ScreenCapturer";
import logger from "@/common/logger";

export class StepPerformer {
  private readonly cacheMode: CacheMode;
  private readonly analysisMode: AnalysisMode;
  private sharedContext: Record<string, any> = {};

  constructor(
    private context: any,
    private promptCreator: StepPerformerPromptCreator,
    private apiSearchPromptCreator: APISearchPromptCreator,
    private viewAnalysisPromptCreator: ViewAnalysisPromptCreator,
    private codeEvaluator: CodeEvaluator,
    private promptHandler: PromptHandler,
    private cacheHandler: StepPerformerCacheHandler,
    private snapshotComparator: SnapshotComparator,
    private screenCapturer: ScreenCapturer,
    cacheMode: CacheMode = "full",
    analysisMode: AnalysisMode = "fast",
  ) {
    this.cacheMode = cacheMode;
    this.analysisMode = analysisMode;
  }

  extendJSContext(newContext: any): void {
    for (const key in newContext) {
      if (key in this.context) {
        logger.warn(
          `Pilot's variable from context \`${key}\` is overridden by a new value from \`extendJSContext\``,
        );
        break;
      }
    }
    this.context = { ...this.context, ...newContext };
  }

  private generateCacheKey(
    step: string,
    previous: PreviousStep[],
  ): string | undefined {
    if (this.cacheMode === "disabled") {
      return undefined;
    }

    const cacheKeyData: any = { step, previous };

    return JSON.stringify(cacheKeyData);
  }

  private async generateCacheValue(
    code: string,
    viewHierarchy: string,
    snapshot: any,
  ): Promise<SingleCacheValue | undefined> {
    if (this.cacheMode === "disabled") {
      throw new Error("Cache is disabled");
    }

    if (this.cacheMode === "lightweight") {
      return { code };
    }

    const snapshotHashes =
      snapshot && (await this.snapshotComparator.generateHashes(snapshot));

    return {
      code,
      viewHierarchy: crypto
        .createHash("md5")
        .update(viewHierarchy)
        .digest("hex"),
      snapshotHash: snapshotHashes,
    };
  }

  private async findCodeInCacheValue(
    cacheValue: CacheValues,
    viewHierarchy: string,
    snapshot?: string,
  ): Promise<string | undefined> {
    if (this.cacheMode === "lightweight") {
      return cacheValue[0].code;
    }

    if (snapshot) {
      const snapshotHash =
        await this.snapshotComparator.generateHashes(snapshot);

      const correctCachedValue = cacheValue.find((singleCachedValue) => {
        return (
          singleCachedValue.snapshotHash &&
          this.snapshotComparator.compareSnapshot(
            snapshotHash,
            singleCachedValue.snapshotHash,
          )
        );
      });

      if (correctCachedValue) {
        return correctCachedValue?.code;
      }
    }

    const viewHierarchyHash = crypto
      .createHash("md5")
      .update(viewHierarchy)
      .digest("hex");
    return cacheValue.find((cachedCode) => {
      if (cachedCode.viewHierarchy === viewHierarchyHash) {
        return cachedCode.code;
      }
    })?.code;
  }

  private shouldOverrideCache() {
    return (
      process.env.PILOT_OVERRIDE_CACHE === "true" ||
      process.env.PILOT_OVERRIDE_CACHE === "1"
    );
  }

  private async generateCode(
    step: string,
    previous: PreviousStep[],
    snapshot: string | undefined,
    viewHierarchy: string,
    isSnapshotImageAttached: boolean,
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(step, previous);

    const cachedValue =
      cacheKey && this.cacheHandler.getStepFromCache(cacheKey);

    if (!this.shouldOverrideCache() && cachedValue) {
      const code = await this.findCodeInCacheValue(
        cachedValue,
        viewHierarchy,
        snapshot,
      );
      if (code) {
        return code;
      }
    }
    let viewAnalysisResult = "";
    let apiSearchResult = "";

    if (this.analysisMode === "full") {
      // Perform view hierarchy analysis and API search only in full mode
      viewAnalysisResult = await this.promptHandler.runPrompt(
        this.viewAnalysisPromptCreator.createPrompt(
          step,
          viewHierarchy,
          previous,
        ),
        undefined,
      );

      apiSearchResult = await this.promptHandler.runPrompt(
        this.apiSearchPromptCreator.createPrompt(step, viewAnalysisResult),
        undefined,
      );
    }

    const prompt = this.promptCreator.createPrompt(
      step,
      viewHierarchy,
      isSnapshotImageAttached,
      previous,
      apiSearchResult,
    );

    const promptResult = await this.promptHandler.runPrompt(prompt, snapshot);
    const code = extractCodeBlock(promptResult);
    if (this.cacheMode !== "disabled") {
      const newCacheValue = await this.generateCacheValue(
        code,
        viewHierarchy,
        snapshot,
      );
      this.cacheHandler.addToTemporaryCache(cacheKey!, newCacheValue);
    }

    return code;
  }

  async perform(
    step: string,
    previous: PreviousStep[] = [],
    screenCapture: ScreenCapturerResult,
    maxAttempts: number = 2,
  ): Promise<CodeEvaluationResult> {
    const loggerSpinner = logger.startSpinner(`🤖 Pilot performing step:`, {
      message: step,
      isBold: true,
      color: "whiteBright",
    });

    this.cacheHandler.loadCacheFromFile();

    let lastError: any = null;
    let lastCode: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { snapshot, viewHierarchy, isSnapshotImageAttached } =
          attempt == 1 ? screenCapture : await this.screenCapturer.capture();

        const code = await this.generateCode(
          step,
          previous,
          snapshot,
          viewHierarchy,
          isSnapshotImageAttached,
        );
        lastCode = code;

        if (!code) {
          loggerSpinner.update(`🤖 Pilot retrying step:`, {
            message: step,
            isBold: true,
            color: "whiteBright",
          });

          throw new Error(
            "Failed to generate code from intent, please retry generating the code or provide a code that throws a descriptive error.",
          );
        }

        const result = await this.codeEvaluator.evaluate(
          code,
          this.context,
          this.sharedContext,
        );
        this.sharedContext = result.sharedContext || this.sharedContext;

        loggerSpinner.stop("success", `🦾 Pilot performed step:`, {
          message: step,
          isBold: true,
          color: "whiteBright",
        });

        if (attempt > 1) {
          logger.info(
            `🔄 Attempt ${attempt}/${maxAttempts} succeeded for step "${step}", generated code:\n`,
            {
              message: `\n\`\`\`javascript\n${code}\n\`\`\``,
              isBold: false,
              color: "gray",
            },
          );
        }

        return result;
      } catch (error) {
        lastError = error;
        logger.warn(
          `💥 Attempt ${attempt}/${maxAttempts} failed for step "${step}": ${error instanceof Error ? error.message : error}`,
        );

        if (attempt < maxAttempts) {
          loggerSpinner.update(`Retrying step: "${step}"`);

          const resultMessage = lastCode
            ? `Caught an error while evaluating "${step}", tried with generated code: "${lastCode}". Validate the code against the APIs and hierarchy and continue with a different approach. If can't, return a code that throws a descriptive error.`
            : `Failed to perform "${step}", could not generate prompt result. Let's try a different approach. If can't, return a code that throws a descriptive error.`;

          previous = [
            ...previous,
            {
              step,
              code: lastCode ?? "undefined",
              result: resultMessage,
            },
          ];
        }
      }
    }

    loggerSpinner.stop(
      "failure",
      `😓 Failed to perform step: "${step}", max attempts exhausted! (${maxAttempts})`,
    );
    throw lastError;
  }
}
