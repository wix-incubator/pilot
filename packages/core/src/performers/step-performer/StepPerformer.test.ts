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
const PROMPT_RESULT =
  "prompt result: <CODE> tap button </CODE> <VIEW_HIERARCHY_SNIPPET> <view></view> </VIEW_HIERARCHY_SNIPPET>";
const CODE = "tap button";
const VIEW_HIERARCHY_SNIPPET = `<VIEW_HIERARCHY_SNIPPET>["<view></view>"]</VIEW_HIERARCHY_SNIPPET>`;
const CODE_EVALUATION_RESULT = "success";
const SNAPSHOT_DATA = "snapshot_data";

const CACHE_VALUE = [
  {
    value: { code: CODE },
    viewHierarchy: [VIEW_HIERARCHY],
    creationTime: Date.now(),
  },
];

describe("StepPerformer", () => {
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
      flushTemporaryCache: jest.fn(),
      clearTemporaryCache: jest.fn(),
      getStepFromCache: jest.fn(),
      getFromTemporaryCache: jest.fn(),
      generateCacheKey: jest.fn(),
      isCacheInUse: jest.fn(),
      getFromPersistentCache: jest.fn(),
      generateHashes: jest.fn(),
      findMatchingCacheEntryViewHierarchyBased: jest.fn(),
      addToTemporaryCacheViewHierarchyBased: jest.fn(),
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

    mockCaptureResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
    };
    mockScreenCapturer.capture.mockResolvedValue(mockCaptureResult);

    const cacheKey = JSON.stringify({
      step: intent,
      previous: previous,
    });

    // const snapshotHashes = {
    //   BlockHash: VIEW_HIERARCHY_HASH,
    //   ViewHierarchyHash: VIEW_HIERARCHY_HASH,
    // };
    // mockCacheHandler.generateHashes.mockResolvedValue(snapshotHashes);
    mockCacheHandler.generateCacheKey.mockReturnValue(cacheKey);
    mockCacheHandler.isCacheInUse.mockReturnValue(true);

    if (cacheExists) {
      const cacheData: Map<string, any> = new Map();
      cacheData.set(cacheKey, CACHE_VALUE);

      mockCacheHandler.getFromPersistentCache.mockImplementation(
        (key: string) => {
          return cacheData.get(key);
        },
      );
      mockCacheHandler.findMatchingCacheEntryValidationMatcherBased.mockReturnValue(
        CACHE_VALUE[0],
      );
    } else {
      mockCacheHandler.getFromPersistentCache.mockReturnValue(undefined);
      mockCacheHandler.findMatchingCacheEntryValidationMatcherBased.mockReturnValue(
        undefined,
      );
    }
  };

  it("should perform an intent successfully with snapshot image support", async () => {
    setupMocks();
    const result = await stepPerformer.perform(INTENT, [], {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
    });

    expect(result).toBe("success");
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
      INTENT,
      VIEW_HIERARCHY,
      true,
      [],
    );
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
      "generated prompt",
      SNAPSHOT_DATA,
    );
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      CODE,
      //VIEW_HIERARCHY_SNIPPET,
      mockContext,
      {},
    );
    expect(mockCacheHandler.getFromPersistentCache).toHaveBeenCalled();
  });

  it("should perform an intent successfully without snapshot image support", async () => {
    setupMocks();
    mockPromptHandler.isSnapshotImageSupported.mockReturnValue(false);
    const result = await stepPerformer.perform(INTENT, [], {
      snapshot: undefined,
      viewHierarchy: VIEW_HIERARCHY,
    });

    expect(result).toBe("success");
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
      INTENT,
      VIEW_HIERARCHY,
      false,
      [],
    );
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
      "generated prompt",
      undefined,
    );
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      CODE,
      //VIEW_HIERARCHY_SNIPPET,
      mockContext,
      {},
    );
    expect(mockCacheHandler.getFromPersistentCache).toHaveBeenCalled();
  });

  it("should perform an intent with undefined snapshot", async () => {
    setupMocks();
    const result = await stepPerformer.perform(INTENT, [], {
      snapshot: undefined,
      viewHierarchy: VIEW_HIERARCHY,
    });

    expect(result).toBe("success");
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
      INTENT,
      VIEW_HIERARCHY,
      false,
      [],
    );
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
      "generated prompt",
      undefined,
    );
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      CODE,
      //VIEW_HIERARCHY_SNIPPET,
      mockContext,
      {},
    );
    expect(mockCacheHandler.getFromPersistentCache).toHaveBeenCalled();
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

    const result = await stepPerformer.perform(intent, previousIntents, {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
    });

    expect(result).toBe("success");
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
      intent,
      VIEW_HIERARCHY,
      true,
      previousIntents,
    );
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
      "generated prompt",
      SNAPSHOT_DATA,
    );
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      CODE,
      //VIEW_HIERARCHY_SNIPPET,
      mockContext,
      {},
    );
    expect(mockCacheHandler.getFromPersistentCache).toHaveBeenCalled();
  });

  it("should throw an error if code evaluation fails", async () => {
    setupMocks();
    mockCodeEvaluator.evaluate.mockRejectedValue(
      new Error("Evaluation failed"),
    );

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
    };

    await expect(
      stepPerformer.perform(INTENT, [], screenCapture, 2),
    ).rejects.toThrow("Evaluation failed");
    expect(
      mockCacheHandler.addToTemporaryCacheValidationMatcherBased,
    ).toHaveBeenCalled();
  });

  it("should use cached prompt result if available", async () => {
    setupMocks({ cacheExists: true });

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
    };

    const result = await stepPerformer.perform(INTENT, [], screenCapture, 2);

    expect(result).toBe("success");
    expect(mockCacheHandler.getFromPersistentCache).toHaveBeenCalled();
    // Should not call runPrompt or createPrompt since result is cached
    expect(mockPromptCreator.createPrompt).not.toHaveBeenCalled();
    expect(mockPromptHandler.runPrompt).not.toHaveBeenCalled();
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      CODE,
      //[VIEW_HIERARCHY],
      mockContext,
      {},
    );
    expect(
      mockCacheHandler.addToTemporaryCacheValidationMatcherBased,
    ).not.toHaveBeenCalled(); // No need to save cache again
  });

  it("should retry if initial runPrompt throws an error and succeed on retry", async () => {
    setupMocks();
    const error = new Error("Initial prompt failed");
    mockPromptHandler.runPrompt.mockRejectedValueOnce(error);
    // On retry, it succeeds
    mockPromptHandler.runPrompt.mockResolvedValueOnce(
      `<CODE>retry generated code</CODE>${VIEW_HIERARCHY_SNIPPET}`,
    );

    const screenCapture: ScreenCapturerResult = {
      snapshot: SNAPSHOT_DATA,
      viewHierarchy: VIEW_HIERARCHY,
    };

    const result = await stepPerformer.perform(INTENT, [], screenCapture, 2);

    expect(result).toBe("success");
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledTimes(2);
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(2);
    expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
      "retry generated code",
      mockContext,
      {},
    );
    expect(
      mockCacheHandler.addToTemporaryCacheValidationMatcherBased,
    ).toHaveBeenCalledTimes(1); // Cache should be saved after success
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
    };

    await expect(
      stepPerformer.perform(INTENT, [], screenCapture, 2),
    ).rejects.toThrow(retryError);
    expect(mockPromptCreator.createPrompt).toHaveBeenCalledTimes(2);
    expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(2);
    expect(mockCodeEvaluator.evaluate).not.toHaveBeenCalled();
    expect(
      mockCacheHandler.addToTemporaryCacheValidationMatcherBased,
    ).not.toHaveBeenCalled();
  });

  describe("extendJSContext", () => {
    it("should extend the context with the given object", async () => {
      // Initial context
      stepPerformer.extendJSContext(dummyBarContext1);

      setupMocks();
      const screenCapture: ScreenCapturerResult = {
        snapshot: SNAPSHOT_DATA,
        viewHierarchy: VIEW_HIERARCHY,
      };

      await stepPerformer.perform(INTENT, [], screenCapture, 2);
      expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
        CODE,
        //VIEW_HIERARCHY_SNIPPET,
        dummyBarContext1,
        {},
      );

      // Extended context
      const extendedContext = { ...dummyBarContext1, ...dummyContext };
      stepPerformer.extendJSContext(dummyContext);

      await stepPerformer.perform(INTENT, [], screenCapture, 2);
      expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
        CODE,
        //VIEW_HIERARCHY_SNIPPET,
        extendedContext,
        {},
      );
    });

    it("should log when a context key is overridden", async () => {
      const mockLabeledLogger = {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        progress: jest.fn(),
      };
      jest.spyOn(logger, "labeled").mockReturnValue(mockLabeledLogger);

      stepPerformer.extendJSContext(dummyBarContext1);

      setupMocks();
      const screenCapture: ScreenCapturerResult = {
        snapshot: SNAPSHOT_DATA,
        viewHierarchy: VIEW_HIERARCHY,
      };

      await stepPerformer.perform(INTENT, [], screenCapture, 2);
      expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
        CODE,
        //VIEW_HIERARCHY_SNIPPET,
        dummyBarContext1,
        {},
      );

      stepPerformer.extendJSContext(dummyBarContext2);
      expect(logger.labeled).toHaveBeenCalledWith("WARNING");
      expect(mockLabeledLogger.warn).toHaveBeenCalledWith(
        "Pilot's variable from context `bar` is overridden by a new value from `extendJSContext`",
      );

      await stepPerformer.perform(INTENT, [], screenCapture, 2);
      expect(mockCodeEvaluator.evaluate).toHaveBeenCalledWith(
        CODE,
        //VIEW_HIERARCHY_SNIPPET,
        dummyBarContext2,
        {},
      );
    });
  });
});
