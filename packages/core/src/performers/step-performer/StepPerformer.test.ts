import { StepPerformer } from "@/performers/step-performer/StepPerformer";
import { StepPerformerPromptCreator } from "./StepPerformerPromptCreator";
import { CodeEvaluator } from "@/common/CodeEvaluator";
import { StepPerformerCacheHandler } from "@/performers/step-performer/StepPerformerCacheHandler";
import { SnapshotComparator } from "@/common/snapshot/comparator/SnapshotComparator";
import { ScreenCapturer } from "@/common/snapshot/ScreenCapturer";
import {
  PromptHandler,
  TestingFrameworkAPICatalog,
  ScreenCapturerResult,
  PreviousStep,
  CacheMode,
} from "@/types";
import * as crypto from "crypto";
import {
  dummyContext,
  dummyBarContext1,
  dummyBarContext2,
} from "@/test-utils/APICatalogTestUtils";
import { APISearchPromptCreator } from "@/common/prompts/APISearchPromptCreator";
import { ViewAnalysisPromptCreator } from "@/common/prompts/ViewAnalysisPromptCreator";
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
  { code: PROMPT_RESULT, viewHierarchy: VIEW_HIERARCHY_HASH },
];

describe("CopilotStepPerformer", () => {
  let copilotStepPerformer: StepPerformer;
  let mockContext: jest.Mocked<any>;
  let mockPromptCreator: jest.Mocked<StepPerformerPromptCreator>;
  let mockApiSearchPromptCreator: jest.Mocked<APISearchPromptCreator>;
  let mockViewAnalysisPromptCreator: jest.Mocked<ViewAnalysisPromptCreator>;
  let mockCodeEvaluator: jest.Mocked<CodeEvaluator>;
  let mockPromptHandler: jest.Mocked<PromptHandler>;
  let mockCacheHandler: jest.Mocked<StepPerformerCacheHandler>;
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

    mockApiSearchPromptCreator = {
      createPrompt: jest.fn(),
    } as unknown as jest.Mocked<APISearchPromptCreator>;

    mockViewAnalysisPromptCreator = {
      createPrompt: jest.fn(),
    } as unknown as jest.Mocked<ViewAnalysisPromptCreator>;

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
    } as unknown as jest.Mocked<StepPerformerCacheHandler>;

    mockSnapshotComparator = {
      generateHashes: jest.fn(),
      compareSnapshot: jest.fn(),
    } as unknown as jest.Mocked<SnapshotComparator>;

    mockScreenCapturer = {
      capture: jest.fn(),
    } as unknown as jest.Mocked<ScreenCapturer>;

    copilotStepPerformer = new StepPerformer(
      mockContext,
      mockPromptCreator,
      mockApiSearchPromptCreator,
      mockViewAnalysisPromptCreator,
      mockCodeEvaluator,
      mockPromptHandler,
      mockCacheHandler,
      mockSnapshotComparator,
      mockScreenCapturer,
      "full",
      "fast",
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
      previous: previous,
    });

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
    setupMocks();
    const result = await copilotStepPerformer.perform(INTENT, [], {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    });

    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(result).toBe("success");
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
      INTENT,
      VIEW_HIERARCHY,
      true,
      [],
      "",
    );
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
      "generated prompt",
      SNAPSHOT_DATA,
    );
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
    expect(mockCacheHandler.getStepFromCache).toHaveBeenCalled();
  });

  it("should perform an intent successfully without snapshot image support", async () => {
    setupMocks();
    mockPromptHandler.isSnapshotImageSupported.mockReturnValue(false);
    const result = await copilotStepPerformer.perform(INTENT, [], {
      snapshot: undefined,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: false,
    });

    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(result).toBe("success");
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
      INTENT,
      VIEW_HIERARCHY,
      false,
      [],
      "",
    );
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
      "generated prompt",
      undefined,
    );
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
    expect(mockCacheHandler.getStepFromCache).toHaveBeenCalled();
  });

  it("should perform an intent with undefined snapshot", async () => {
    setupMocks();
    const result = await copilotStepPerformer.perform(INTENT, [], {
      snapshot: undefined,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: false,
    });

    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(result).toBe("success");
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
      INTENT,
      VIEW_HIERARCHY,
      false,
      [],
      "",
    );
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
      "generated prompt",
      undefined,
    );
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
    expect(mockCacheHandler.getStepFromCache).toHaveBeenCalled();
  });

  it("should perform an intent successfully with previous intents", async () => {
    setupMocks();
    const intent = "current intent";
    const previousIntents = [
      {
        step: "previous intent",
        code: "previous code",
        result: "previous result",
      },
    ];

    const result = await copilotStepPerformer.perform(intent, previousIntents, {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    });

    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(result).toBe("success");
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
      intent,
      VIEW_HIERARCHY,
      true,
      previousIntents,
      "",
    );
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
      "generated prompt",
      SNAPSHOT_DATA,
    );
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
    expect(mockCacheHandler.getStepFromCache).toHaveBeenCalled();
  });

  it("should throw an error if code evaluation fails", async () => {
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
      copilotStepPerformer.perform(INTENT, [], screenCapture, 2),
    ).rejects.toThrow("Evaluation failed");
    expect(mockCacheHandler.addToTemporaryCache).toHaveBeenCalled();
  });

  it("should use cached prompt result if available", async () => {
    setupMocks({ cacheExists: true });

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    };

    const result = await copilotStepPerformer.perform(
      INTENT,
      [],
      screenCapture,
      2,
    );

    expect(result).toBe("success");
    expect(mockCacheHandler.getStepFromCache).toHaveBeenCalled();
    // Should not call runPrompt or createPrompt since result is cached
    expect(mockPromptCreator.createPrompt).not.toHaveBeenCalled();
    expect(mockPromptHandler.runPrompt).not.toHaveBeenCalled();
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
    expect(mockCacheHandler.addToTemporaryCache).not.toHaveBeenCalled(); // No need to save cache again
  });

  it("should retry if initial runPrompt throws an error and succeed on retry", async () => {
    setupMocks();
    const error = new Error("Initial prompt failed");
    mockPromptHandler.runPrompt.mockRejectedValueOnce(error);
    // On retry, it succeeds
    mockPromptHandler.runPrompt.mockResolvedValueOnce("retry generated code");

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    };

    const result = await copilotStepPerformer.perform(
      INTENT,
      [],
      screenCapture,
      2,
    );

    expect(result).toBe("success");
    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledTimes(2);
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(2);
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      "retry generated code",
      mockContext,
      {},
    );
    expect(mockCacheHandler.addToTemporaryCache).toHaveBeenCalledTimes(1); // Cache should be saved after success
  });

  it("should throw original error if retry also fails", async () => {
    setupMocks();
    const error = new Error("Initial prompt failed");
    const retryError = new Error("Retry prompt failed");
    mockPromptHandler.runPrompt.mockRejectedValueOnce(error);
    mockPromptHandler.runPrompt.mockRejectedValueOnce(retryError);

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    };

    await expect(
      copilotStepPerformer.perform(INTENT, [], screenCapture, 2),
    ).rejects.toThrow(retryError);
    expect(mockCacheHandler.loadCacheFromFile).toHaveBeenCalled();
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledTimes(2);
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(2);
    expect(mockCodeEvaluator.evaluate).not.toHaveBeenCalled();
    expect(mockCacheHandler.addToTemporaryCache).not.toHaveBeenCalled();
  });

  it("should not use cached prompt result if PILOT_OVERRIDE_CACHE is enabled", async () => {
    const intent = "tap button";
    setupMocks({ cacheExists: true, overrideCache: true, intent });

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
      isSnapshotImageAttached: true,
    };

    const result = await copilotStepPerformer.perform(
      intent,
      [],
      screenCapture,
      2,
    );

    expect(result).toBe("success");
    // Should call runPrompt and createPrompt. Shouldn't use current cache but override it
    expect(mockPromptCreator.createPrompt).toHaveBeenCalled();
    expect(mockPromptHandler.runPrompt).toHaveBeenCalled();
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      PROMPT_RESULT,
      mockContext,
      {},
    );
    expect(mockCacheHandler.addToTemporaryCache).toHaveBeenCalled();
  });

  describe("extendJSContext", () => {
    it("should extend the context with the given object", async () => {
      // Initial context
      copilotStepPerformer.extendJSContext(dummyBarContext1);

      setupMocks();
      const screenCapture: ScreenCapturerResult = {
        snapshot: SNAPSHOT_DATA,
        viewHierarchy: VIEW_HIERARCHY,
        isSnapshotImageAttached: true,
      };

      await copilotStepPerformer.perform(INTENT, [], screenCapture, 2);
      expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
        PROMPT_RESULT,
        dummyBarContext1,
        {},
      );

      // Extended context
      const extendedContext = { ...dummyBarContext1, ...dummyContext };
      copilotStepPerformer.extendJSContext(dummyContext);

      await copilotStepPerformer.perform(INTENT, [], screenCapture, 2);
      expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
        PROMPT_RESULT,
        extendedContext,
        {},
      );
    });

    it("should log when a context key is overridden", async () => {
      jest.spyOn(logger, "warn").mockImplementation(() => {});

      copilotStepPerformer.extendJSContext(dummyBarContext1);

      setupMocks();
      const screenCapture: ScreenCapturerResult = {
        snapshot: SNAPSHOT_DATA,
        viewHierarchy: VIEW_HIERARCHY,
        isSnapshotImageAttached: true,
      };

      await copilotStepPerformer.perform(INTENT, [], screenCapture, 2);
      expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
        PROMPT_RESULT,
        dummyBarContext1,
        {},
      );

      copilotStepPerformer.extendJSContext(dummyBarContext2);
      expect(logger.warn).toHaveBeenCalledWith(
        "Pilot's variable from context `bar` is overridden by a new value from `extendJSContext`",
      );

      await copilotStepPerformer.perform(INTENT, [], screenCapture, 2);
      expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
        PROMPT_RESULT,
        dummyBarContext2,
        {},
      );
    });
  });
  describe("cache modes", () => {
    const testCacheModes = async (cacheMode: CacheMode) => {
      const generatedKeys: string[] = [];
      const generatedValues: any[] = [];
      mockCacheHandler.addToTemporaryCache.mockImplementation(
        (key: string, newVal: any) => {
          generatedKeys.push(key);
          generatedValues.push(newVal);
        },
      );

      copilotStepPerformer = new StepPerformer(
        mockContext,
        mockPromptCreator,
        mockApiSearchPromptCreator,
        mockViewAnalysisPromptCreator,
        mockCodeEvaluator,
        mockPromptHandler,
        mockCacheHandler,
        mockSnapshotComparator,
        mockScreenCapturer,
        cacheMode,
        "fast",
      );
      const screenCapture: ScreenCapturerResult = {
        snapshot: SNAPSHOT_DATA,
        viewHierarchy: VIEW_HIERARCHY,
        isSnapshotImageAttached: true,
      };

      setupMocks({
        promptResult: "```\nconst code = true;\n```",
        codeEvaluationResult: "success",
      });
      await copilotStepPerformer.perform(INTENT, [], screenCapture, undefined);
      return { key: generatedKeys[0], value: generatedValues };
    };

    it("should include view hierarchy hash in cache value when mode is full", async () => {
      const cache = await testCacheModes("full");
      expect(cache.value[0]).toHaveProperty("viewHierarchy");
      expect(cache.value[0].viewHierarchy).toBe("hash");
    });

    it("should not include view hierarchy hash in cache value when mode is lightweight", async () => {
      const cache = await testCacheModes("lightweight");
      const parsedKey = JSON.parse(cache.key);
      expect(parsedKey).not.toHaveProperty("viewHierarchy");
      expect(cache.value[0]).not.toHaveProperty("viewHierarchy");
    });

    it("should not generate cache key when mode is disabled", async () => {
      const firstKey = await testCacheModes("disabled");
      const secondKey = await testCacheModes("disabled");
      expect(firstKey.key).toBeUndefined();
      expect(secondKey.key).toBeUndefined();
    });

    it("should not use cache when mode is disabled", async () => {
      const screenCapture: ScreenCapturerResult = {
        snapshot: SNAPSHOT_DATA,
        viewHierarchy: VIEW_HIERARCHY,
        isSnapshotImageAttached: true,
      };

      copilotStepPerformer = new StepPerformer(
        mockContext,
        mockPromptCreator,
        mockApiSearchPromptCreator,
        mockViewAnalysisPromptCreator,
        mockCodeEvaluator,
        mockPromptHandler,
        mockCacheHandler,
        mockSnapshotComparator,
        mockScreenCapturer,
        "disabled",
        "fast",
      );

      setupMocks({ cacheExists: true });
      await copilotStepPerformer.perform(INTENT, [], screenCapture, undefined);

      expect(mockPromptHandler.runPrompt).toHaveBeenCalled();
    });
  });

  describe("analysis modes", () => {
    it("should perform full analysis in full mode", async () => {
      setupMocks();
      const viewAnalysisResult = "view analysis result";
      const apiSearchResult = "api search result";

      mockViewAnalysisPromptCreator.createPrompt.mockReturnValue(
        "view analysis prompt",
      );
      mockApiSearchPromptCreator.createPrompt.mockReturnValue(
        "api search prompt",
      );
      mockPromptHandler.runPrompt
        .mockResolvedValueOnce(viewAnalysisResult)
        .mockResolvedValueOnce(apiSearchResult)
        .mockResolvedValueOnce(PROMPT_RESULT);

      copilotStepPerformer = new StepPerformer(
        mockContext,
        mockPromptCreator,
        mockApiSearchPromptCreator,
        mockViewAnalysisPromptCreator,
        mockCodeEvaluator,
        mockPromptHandler,
        mockCacheHandler,
        mockSnapshotComparator,
        mockScreenCapturer,
        "full",
        "full",
      );

      const screenCapture: ScreenCapturerResult = {
        snapshot: SNAPSHOT_DATA,
        viewHierarchy: VIEW_HIERARCHY,
        isSnapshotImageAttached: true,
      };

      const result = await copilotStepPerformer.perform(
        INTENT,
        [],
        screenCapture,
      );

      expect(result).toBe(CODE_EVALUATION_RESULT);
      expect(mockViewAnalysisPromptCreator.createPrompt).toHaveBeenCalledWith(
        INTENT,
        VIEW_HIERARCHY,
        [],
      );
      expect(mockApiSearchPromptCreator.createPrompt).toHaveBeenCalledWith(
        INTENT,
        viewAnalysisResult,
      );
      expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
        INTENT,
        VIEW_HIERARCHY,
        true,
        [],
        apiSearchResult,
      );
    });

    it("should skip analysis in fast mode", async () => {
      setupMocks();

      copilotStepPerformer = new StepPerformer(
        mockContext,
        mockPromptCreator,
        mockApiSearchPromptCreator,
        mockViewAnalysisPromptCreator,
        mockCodeEvaluator,
        mockPromptHandler,
        mockCacheHandler,
        mockSnapshotComparator,
        mockScreenCapturer,
        "full",
        "fast",
      );

      const screenCapture: ScreenCapturerResult = {
        snapshot: SNAPSHOT_DATA,
        viewHierarchy: VIEW_HIERARCHY,
        isSnapshotImageAttached: true,
      };

      const result = await copilotStepPerformer.perform(
        INTENT,
        [],
        screenCapture,
      );

      expect(result).toBe(CODE_EVALUATION_RESULT);
      expect(mockViewAnalysisPromptCreator.createPrompt).not.toHaveBeenCalled();
      expect(mockApiSearchPromptCreator.createPrompt).not.toHaveBeenCalled();
      expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
        INTENT,
        VIEW_HIERARCHY,
        true,
        [],
        "",
      );
    });
  });
});
