import { StepPerformerPromptCreator } from "./StepPerformerPromptCreator";
import { CodeEvaluator } from "@/common/CodeEvaluator";
import { CacheHandler } from "@/common/cacheHandler/CacheHandler";
import { SnapshotComparator } from "@/common/snapshot/comparator/SnapshotComparator";
import {
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
        logger.warn(
          `Pilot's variable from context \`${key}\` is overridden by a new value from \`extendJSContext\``,
        );
        break;
      }
    }
    this.context = { ...this.context, ...newContext };
  }

  private async generateCacheValue(
    code: string,
    viewHierarchy: string,
    snapshot: any,
  ): Promise<SingleCacheValue | undefined> {
    if (!this.cacheHandler.isCacheInUse()) {
      throw new Error("Cache is disabled");
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

  private async findCodeInCacheValues(
    cacheValue: CacheValues,
    viewHierarchy: string,
    snapshot?: string,
  ): Promise<string | undefined> {
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

  private async generateCode(
    step: string,
    previous: PreviousStep[],
    snapshot: string | undefined,
    viewHierarchy: string,
    isSnapshotImageAttached: boolean,
  ): Promise<string> {
    const cacheKey = this.cacheHandler.generateCacheKey(step, previous);

    if (this.cacheHandler.isCacheInUse() && cacheKey) {
      const code = await this.getValueFromCache(
        cacheKey,
        viewHierarchy,
        snapshot,
      );
      if (code) {
        return code;
      }
    }

    const prompt = this.promptCreator.createPrompt(
      step,
      viewHierarchy,
      isSnapshotImageAttached,
      previous,
    );

    const promptResult = await this.promptHandler.runPrompt(prompt, snapshot);
    const code = extractCodeBlock(promptResult);
    if (this.cacheHandler.isCacheInUse()) {
      const newCacheValue = await this.generateCacheValue(
        code,
        viewHierarchy,
        snapshot,
      );
      this.cacheHandler.addToTemporaryCache(cacheKey!, newCacheValue);
    }

    return code;
  }

  async getValueFromCache(
    cacheKey: string,
    viewHierarchy: string,
    snapshot: string | undefined,
  ): Promise<string | undefined> {
    const cachedValues =
      cacheKey && this.cacheHandler.getStepFromCache(cacheKey);

    if (cachedValues) {
      const code = await this.findCodeInCacheValues(
        cachedValues,
        viewHierarchy,
        snapshot,
      );
      if (code) {
        return code;
      }
    }
    return undefined;
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
        const errorDetails = error instanceof Error ? error.message : error;
        logger.warn(
          `💥 Attempt ${attempt}/${maxAttempts} failed for step: ${step}, with error: ${errorDetails}`,
        );

        if (attempt < maxAttempts) {
          loggerSpinner.update(`Retrying step: "${step}"`);

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

    loggerSpinner.stop(
      "failure",
      `😓 Failed to perform step: "${step}", max attempts exhausted! (${maxAttempts})`,
    );
    throw lastError;
  }
}
