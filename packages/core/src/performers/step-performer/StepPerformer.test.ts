import { StepPerformer } from "@/performers/step-performer/StepPerformer";
import { StepPerformerPromptCreator } from "./StepPerformerPromptCreator";
import { CodeEvaluator } from "@/common/CodeEvaluator";
import { CacheHandler } from "../../common/cacheHandler/CacheHandler";
import { SnapshotComparator } from "@/common/snapshot/comparator/SnapshotComparator";
import { ScreenCapturer } from "@/common/snapshot/ScreenCapturer";
import {
  PromptHandler,
  TestingFrameworkAPICatalog,
  ScreenCapturerResult,
  PreviousStep,
} from "@/types";
import * as crypto from "crypto";
import {
  dummyContext,
  dummyBarContext1,
  dummyBarContext2,
} from "@/test-utils/APICatalogTestUtils";
import logger from "@/common/logger";

jest.mock("fs");
jest.mock("crypto");

const INTENT = "tap button";
const VIEW_HIERARCHY = "<view></view>";
const PROMPT_RESULT = "generated code";
const CODE_EVALUATION_RESULT = "success";
const SNAPSHOT_DATA = "snapshot_data";
const VIEW_HIERARCHY_HASH = "hash";
const CACHE_VALUE = [
  { code: PROMPT_RESULT, viewHierarchyHash: VIEW_HIERARCHY_HASH },
];

describe("PilotStepPerformer", () => {
  let stepPerformer: StepPerformer;
  let mockContext: jest.Mocked<any>;
  let mockPromptCreator: jest.Mocked<StepPerformerPromptCreator>;
  let mockCodeEvaluator: jest.Mocked<CodeEvaluator>;
  let mockPromptHandler: jest.Mocked<PromptHandler>;
  let mockCacheHandler: jest.Mocked<CacheHandler>;
  let mockSnapshotComparator: jest.Mocked<SnapshotComparator>;
  let mockScreenCapturer: jest.Mocked<ScreenCapturer>;
  let mockCaptureResult: ScreenCapturerResult;
  let uuidCounter = 0;

  beforeEach(() => {
    jest.resetAllMocks();
    uuidCounter = 0;
    (crypto.randomUUID as jest.Mock).mockImplementation(
      () => `uuid-${uuidCounter++}`,
    );
    const apiCatalog: TestingFrameworkAPICatalog = {
      context: {},
      categories: [],
    };

    mockContext = {} as jest.Mocked<any>;

    // Create mock instances of dependencies
    mockPromptCreator = {
      apiCatalog: apiCatalog,
      createPrompt: jest.fn(),
      createBasePrompt: jest.fn(),
      createContext: jest.fn(),
      createAPIInfo: jest.fn(),
      extendAPICategories: jest.fn(),
    } as unknown as jest.Mocked<StepPerformerPromptCreator>;

    mockCodeEvaluator = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<CodeEvaluator>;

    mockPromptHandler = {
      runPrompt: jest.fn(),
      isSnapshotImageSupported: jest.fn(),
    } as jest.Mocked<PromptHandler>;

    mockCacheHandler = {
      loadCacheFromFile: jest.fn(),
      saveCacheToFile: jest.fn(),
      existInCache: jest.fn(),
      addToTemporaryCache: jest.fn(),
      flushTemporaryCache: jest.fn(),
      clearTemporaryCache: jest.fn(),
      getStepFromCache: jest.fn(),
      getFromTemporaryCache: jest.fn(),
      isCacheInUse: jest.fn(),
      generateCacheKey: jest.fn(),
      hashViewHierarchy: jest.fn(),
      generateSnapshotHash: jest.fn(),
      generateCacheHashes: jest.fn(),
      findInCache: jest.fn(),
    } as unknown as jest.Mocked<CacheHandler>;

    mockSnapshotComparator = {
      generateHashes: jest.fn(),
      compareSnapshot: jest.fn(),
    } as unknown as jest.Mocked<SnapshotComparator>;

    mockScreenCapturer = {
      capture: jest.fn(),
    } as unknown as jest.Mocked<ScreenCapturer>;

    stepPerformer = new StepPerformer(
      mockContext,
      mockPromptCreator,
      mockCodeEvaluator,
      mockPromptHandler,
      mockCacheHandler,
      mockSnapshotComparator,
      mockScreenCapturer,
    );
  });

  interface SetupMockOptions {
    isSnapshotSupported?: boolean;
    snapshotData?: string | null;
    viewHierarchy?: string;
    promptResult?: string;
    codeEvaluationResult?: any;
    cacheExists?: boolean;
    overrideCache?: boolean;
    previous?: PreviousStep[];
    intent?: string;
  }

  const setupMocks = ({
    isSnapshotSupported = true,
    promptResult = PROMPT_RESULT,
    codeEvaluationResult = CODE_EVALUATION_RESULT,
    cacheExists = false,
    overrideCache = false,
    previous = [],
    intent = INTENT,
  }: SetupMockOptions = {}) => {
    mockPromptHandler.isSnapshotImageSupported.mockReturnValue(
      isSnapshotSupported,
    );
    mockPromptCreator.createPrompt.mockReturnValue("generated prompt");
    mockPromptHandler.runPrompt.mockResolvedValue(promptResult);
    mockCodeEvaluator.evaluate.mockResolvedValue(codeEvaluationResult);

    if (overrideCache) {
      process.env.PILOT_OVERRIDE_CACHE = "true";
    } else {
      process.env.PILOT_OVERRIDE_CACHE = "false";
    }

    const viewHierarchyHash = "hash";
    (crypto.createHash as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnValue({
        digest: jest.fn().mockReturnValue(viewHierarchyHash),
      }),
    });

    mockCaptureResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    };
    mockScreenCapturer.capture.mockResolvedValue(mockCaptureResult);

    const cacheKey = JSON.stringify({
      step: intent,
      previousSteps: previous.map((p) => ({ step: p.step })),
    });

    jest
      .spyOn(stepPerformer as any, "generateCacheKey")
      .mockReturnValue(cacheKey);

    if (cacheExists) {
      jest
        .spyOn(stepPerformer as any, "findCodeInCache")
        .mockResolvedValue(PROMPT_RESULT);
    } else {
      jest
        .spyOn(stepPerformer as any, "findCodeInCache")
        .mockResolvedValue(undefined);
    }

    mockCacheHandler.findInCache.mockImplementation(() => {
      return Promise.resolve(cacheExists ? {
        code: PROMPT_RESULT,
        viewHierarchyHash: VIEW_HIERARCHY_HASH,
        snapshotHash: { BlockHash: "hash" }
      } : undefined);
    });
    mockCacheHandler.generateCacheHashes.mockResolvedValue({
      viewHierarchyHash: VIEW_HIERARCHY_HASH,
      snapshotHash: { BlockHash: "hash" },
    });

    mockCacheHandler.isCacheInUse.mockReturnValue(true);

    if (cacheExists) {
      const cacheData: Map<string, any> = new Map();
      cacheData.set(cacheKey, CACHE_VALUE);

      mockCacheHandler.getStepFromCache.mockImplementation((key: string) => {
        return cacheData.get(key);
      });
    } else {
      mockCacheHandler.getStepFromCache.mockReturnValue(undefined);
    }
  };

  it("should perform an intent successfully with snapshot image support", async () => {
    const mockGenerateCodeSpy = jest.spyOn(
      stepPerformer as any,
      "generateCode",
    );
    mockGenerateCodeSpy.mockImplementation(async () => PROMPT_RESULT);

    setupMocks();
    const result = await stepPerformer.perform(INTENT, [], {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    });

    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(result).toBe("success");

    expect(mockGenerateCodeSpy).toHaveBeenCalled();

    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
  });

  it("should perform an intent successfully without snapshot image support", async () => {
    const mockGenerateCodeSpy = jest.spyOn(
      stepPerformer as any,
      "generateCode",
    );
    mockGenerateCodeSpy.mockImplementation(async () => PROMPT_RESULT);

    setupMocks();
    mockPromptHandler.isSnapshotImageSupported.mockReturnValue(false);

    const result = await stepPerformer.perform(INTENT, [], {
      snapshot: undefined,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: false,
    });

    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(result).toBe("success");

    expect(mockGenerateCodeSpy).toHaveBeenCalled();

    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
  });

  it("should perform an intent with undefined snapshot", async () => {
    const mockGenerateCodeSpy = jest.spyOn(
      stepPerformer as any,
      "generateCode",
    );
    mockGenerateCodeSpy.mockImplementation(async () => PROMPT_RESULT);

    setupMocks();

    const result = await stepPerformer.perform(INTENT, [], {
      snapshot: undefined,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: false,
    });

    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(result).toBe("success");

    expect(mockGenerateCodeSpy).toHaveBeenCalled();

    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
  });

  it("should perform an intent successfully with previous intents", async () => {
    const mockGenerateCodeSpy = jest.spyOn(
      stepPerformer as any,
      "generateCode",
    );
    mockGenerateCodeSpy.mockImplementation(async () => PROMPT_RESULT);

    setupMocks();
    const intent = "current intent";
    const previousIntents = [
      {
        step: "previous intent",
        code: "previous code",
        result: "previous result",
      },
    ];

    const result = await stepPerformer.perform(intent, previousIntents, {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    });

    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(result).toBe("success");

    expect(mockGenerateCodeSpy).toHaveBeenCalled();

    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
  });

  it("should throw an error if code evaluation fails", async () => {
    const mockGenerateCodeSpy = jest.spyOn(
      stepPerformer as any,
      "generateCode",
    );
    mockGenerateCodeSpy.mockImplementation(async () => PROMPT_RESULT);

    setupMocks();
    mockCodeEvaluator.evaluate.mockRejectedValue(
      new Error("Evaluation failed"),
    );

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    };

    await expect(
      stepPerformer.perform(INTENT, [], screenCapture, 2),
    ).rejects.toThrow("Evaluation failed");
  });

  it("should use cached prompt result if available", async () => {
    setupMocks({ cacheExists: true });

    jest
      .spyOn(stepPerformer as any, "findCodeInCache")
      .mockResolvedValue(PROMPT_RESULT);

    mockPromptCreator.createPrompt.mockClear();
    mockPromptHandler.runPrompt.mockClear();

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    };

    const result = await stepPerformer.perform(INTENT, [], screenCapture, 2);

    expect(result).toBe("success");
    // Should not call runPrompt or createPrompt since result is cached

    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
  });

  it("should retry if initial code generation fails but succeeds on retry", async () => {
    const generateCodeSpy = jest.spyOn(stepPerformer as any, "generateCode");
    generateCodeSpy
      .mockRejectedValueOnce(new Error("Code generation failed"))
      .mockResolvedValueOnce("retry generated code");

    setupMocks();
    // On retry, it succeeds

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    };

    const result = await stepPerformer.perform(
      INTENT,
      [],
      screenCapture,
      2, // Max retries
    );

    expect(result).toBe("success");
    expect(generateCodeSpy).toHaveBeenCalledTimes(2);
    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      "retry generated code",
      mockContext,
      {},
    );
  });

  it("should throw error if all retries fail", async () => {
    // For this test we'll make generateCode always fail
    const firstError = new Error("First generation failed");
    const secondError = new Error("Second generation failed");

    const generateCodeSpy = jest.spyOn(stepPerformer as any, "generateCode");
    generateCodeSpy
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError);

    setupMocks();

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    };

    await expect(
      stepPerformer.perform(INTENT, [], screenCapture, 2),
    ).rejects.toThrow(secondError);

    expect(generateCodeSpy).toHaveBeenCalledTimes(2);
    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    // Code evaluator should not be called since we never got valid code
    expect(mockCodeEvaluator.evaluate).not.toHaveBeenCalled();
  });

  describe("extendJSContext", () => {
    it("should extend the context with the given object", async () => {
      const mockGenerateCodeSpy = jest.spyOn(
        stepPerformer as any,
        "generateCode",
      );
      mockGenerateCodeSpy.mockResolvedValue(PROMPT_RESULT);

      // Initial context
      stepPerformer.extendJSContext(dummyBarContext1);

      setupMocks();
      const screenCapture: ScreenCapturerResult = {
        snapshot: SNAPSHOT_DATA,
        viewHierarchy: VIEW_HIERARCHY,
        isSnapshotImageAttached: true,
      };

      await stepPerformer.perform(INTENT, [], screenCapture, 2);
      expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
        PROMPT_RESULT,
        dummyBarContext1,
        {},
      );

      // Extended context
      const extendedContext = { ...dummyBarContext1, ...dummyContext };
      stepPerformer.extendJSContext(dummyContext);

      await stepPerformer.perform(INTENT, [], screenCapture, 2);
      expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
        PROMPT_RESULT,
        extendedContext,
        {},
      );
    });

    it("should log when a context key is overridden", async () => {
      const loggerSpy = jest.spyOn(logger, "warn").mockImplementation(() => {});

      const mockGenerateCodeSpy = jest.spyOn(
        stepPerformer as any,
        "generateCode",
      );
      mockGenerateCodeSpy.mockResolvedValue(PROMPT_RESULT);
      stepPerformer.extendJSContext(dummyBarContext1);
      stepPerformer.extendJSContext(dummyBarContext2);

      expect(loggerSpy).toHaveBeenCalled();

      loggerSpy.mockRestore();
    });
  });
});
