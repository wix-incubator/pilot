import { AutoPerformer } from "./AutoPerformer";
import { AutoPerformerPromptCreator } from "./AutoPerformerPromptCreator";
import { ScreenCapturer } from "../../common/snapshot/ScreenCapturer";
import { CacheHandler } from "../../common/cacheHandler/CacheHandler";
import { SnapshotComparator } from "../../common/snapshot/comparator/SnapshotComparator";
import {
  AutoPreviousStep,
  PromptHandler,
  ScreenCapturerResult,
  AutoStepReport,
  AutoReport,
} from "@/types";
import { StepPerformer } from "../step-performer/StepPerformer";
import { AUTOPILOT_REVIEW_DEFAULTS } from "./reviews/reviewDefaults";
import * as extractTaggedOutputsModule from "@/common/extract/extractTaggedOutputs";

const GOAL = "tap button";
const VIEW_HIERARCHY = "<view></view>";
const GENERATED_PROMPT = "generated prompt";

// Updated PROMPT_RESULT to include screenDescription, UX, Accessibility, and Internationalization sections
const PROMPT_RESULT = `
<SCREENDESCRIPTION>
default name
</SCREENDESCRIPTION>
<THOUGHTS>
I think this is great
</THOUGHTS>
<ACTION>
Tap on GREAT button
</ACTION>
<UX>
<SUMMARY>
The review of UX
</SUMMARY>
<FINDINGS>
- UX finding one
- UX finding two
</FINDINGS>
<SCORE>
7/10
</SCORE>
</UX>
<ACCESSIBILITY>
<SUMMARY>
The review of accessibility
</SUMMARY>
<FINDINGS>
- ACC finding one
- ACC finding two
</FINDINGS>
<SCORE>
8/10
</SCORE>
</ACCESSIBILITY>
<INTERNATIONALIZATION>
<SUMMARY>
The review of i18n
</SUMMARY>
<FINDINGS>
- i18n finding one
- i18n finding two
</FINDINGS>
<SCORE>
6/10
</SCORE>
</INTERNATIONALIZATION>`;

const SNAPSHOT_DATA = "snapshot_data";

describe("AutoPerformer", () => {
  let performer: AutoPerformer;
  let mockPromptCreator: jest.Mocked<AutoPerformerPromptCreator>;
  let mockPromptHandler: jest.Mocked<PromptHandler>;
  let mockStepPerformer: jest.Mocked<StepPerformer>;
  let mockScreenCapturer: jest.Mocked<ScreenCapturer>;
  let mockCaptureResult: ScreenCapturerResult;
  let mockCacheHandler: jest.Mocked<CacheHandler>;
  let mockSnapshotComparator: jest.Mocked<SnapshotComparator>;

  beforeEach(() => {
    jest.resetAllMocks();

    // Create mock instances of dependencies
    mockPromptCreator = {
      createPrompt: jest.fn(),
    } as unknown as jest.Mocked<AutoPerformerPromptCreator>;

    mockPromptHandler = {
      runPrompt: jest.fn(),
      isSnapshotImageSupported: jest.fn(),
    } as jest.Mocked<PromptHandler>;

    mockStepPerformer = {
      perform: jest.fn(),
    } as unknown as jest.Mocked<StepPerformer>;

    // Create mock for capture function
    mockScreenCapturer = {
      capture: jest.fn(),
    } as unknown as jest.Mocked<ScreenCapturer>;

    mockCacheHandler = {
      loadCacheFromFile: jest.fn(),
      saveCacheToFile: jest.fn(),
      existInCache: jest.fn(),
      addToTemporaryCache: jest.fn(),
      flushTemporaryCache: jest.fn(),
      clearTemporaryCache: jest.fn(),
      getStepFromCache: jest.fn(),
      generateCacheKey: jest.fn(),
      isCacheInUse: jest.fn(),
      getFromPersistentCache: jest.fn(),
      findMatchingCacheEntry: jest.fn(),
    } as unknown as jest.Mocked<CacheHandler>;

    mockSnapshotComparator = {
      generateHashes: jest.fn(),
      compareSnapshot: jest.fn(),
    } as unknown as jest.Mocked<SnapshotComparator>;

    // Instantiate PilotPerformer with the mocks
    performer = new AutoPerformer(
      mockPromptCreator,
      mockStepPerformer,
      mockPromptHandler,
      mockScreenCapturer,
      mockCacheHandler,
      mockSnapshotComparator,
    );
  });

  interface SetupMockOptions {
    isSnapshotSupported?: boolean;
    snapshotData?: string | null;
    viewHierarchy?: string;
    promptResult?: string;
    cacheExists?: boolean;
  }

  const setupMocks = ({
    isSnapshotSupported = true,
    snapshotData = SNAPSHOT_DATA,
    viewHierarchy = VIEW_HIERARCHY,
    promptResult = PROMPT_RESULT,
    cacheExists = false,
  }: SetupMockOptions = {}) => {
    // Prepare the mockCaptureResult object
    mockCaptureResult = {
      snapshot: snapshotData !== null ? snapshotData : undefined,
      viewHierarchy: viewHierarchy,
    };

    // Mock the capture function to return mockCaptureResult
    mockScreenCapturer.capture.mockResolvedValue(mockCaptureResult);

    mockPromptCreator.createPrompt.mockReturnValue(GENERATED_PROMPT);
    mockPromptHandler.runPrompt.mockImplementation(() => {
      jest
        .spyOn(extractTaggedOutputsModule, "extractAutoPilotStepOutputs")
        .mockReturnValue({
          screenDescription: "default name",
          thoughts: "I think this is great",
          action: "Tap on GREAT button",
          goalSummary: undefined,
          UX: `<SUMMARY>
The review of UX
</SUMMARY>
<FINDINGS>
- UX finding one
- UX finding two
</FINDINGS>
<SCORE>
7/10
</SCORE>`,
          Accessibility: `<SUMMARY>
The review of accessibility
</SUMMARY>
<FINDINGS>
- ACC finding one
- ACC finding two
</FINDINGS>
<SCORE>
8/10
</SCORE>`,
          Internationalization: `<SUMMARY>
The review of i18n
</SUMMARY>
<FINDINGS>
- i18n finding one
- i18n finding two
</FINDINGS>
<SCORE>
6/10
</SCORE>`,
        });

      return Promise.resolve(promptResult);
    });
    mockPromptHandler.isSnapshotImageSupported.mockReturnValue(
      isSnapshotSupported,
    );

    const cacheKey = JSON.stringify({ goal: GOAL, previousSteps: [] });

    if (cacheExists) {
      const screenCapturerResult: ScreenCapturerResult = {
        snapshot: SNAPSHOT_DATA,
        viewHierarchy: VIEW_HIERARCHY,
      };

      mockCacheHandler.generateCacheKey.mockReturnValue(cacheKey);
      mockSnapshotComparator.generateHashes.mockReturnValue(
        Promise.resolve({
          BlockHash: "hash",
          ViewHierarchyHash: "viewHash",
        }),
      );
      mockSnapshotComparator.compareSnapshot.mockReturnValue(true);
      mockCacheHandler.isCacheInUse.mockReturnValue(true);

      const cacheData: Map<string, any> = new Map();
      cacheData.set(cacheKey, [
        {
          screenCapturerResult: screenCapturerResult,
          snapshotHash: {
            BlockHash: "hash",
          },
          screenDescription: "Screen 1",
          plan: undefined,
          review: undefined,
          goalAchieved: false,
          summary: "success",
        },
      ]);

      mockCacheHandler.getFromPersistentCache.mockImplementation(
        (key: string) => {
          return cacheData.get(key);
        },
      );
    } else {
      mockCacheHandler.getFromPersistentCache.mockReturnValue(undefined);
    }
  };

  describe("without review types", () => {
    it("should perform an intent successfully with snapshot image support", async () => {
      setupMocks();

      const result = await performer.analyseScreenAndCreatePilotStep(
        GOAL,
        [],
        mockCaptureResult,
      );

      const expectedResult = {
        screenDescription: "default name",
        plan: {
          thoughts: "I think this is great",
          action: "Tap on GREAT button",
        },
        review: {},
        goalAchieved: false,
      };

      expect(result).toEqual(expectedResult);
      expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
        GOAL,
        VIEW_HIERARCHY,
        true,
        [],
        undefined,
      );
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
        GENERATED_PROMPT,
        SNAPSHOT_DATA,
      );
    });

    it("should perform an intent successfully without snapshot image support", async () => {
      setupMocks({ isSnapshotSupported: false });

      const result = await performer.analyseScreenAndCreatePilotStep(
        GOAL,
        [],
        mockCaptureResult,
      );

      const expectedResult = {
        screenDescription: "default name",
        plan: {
          thoughts: "I think this is great",
          action: "Tap on GREAT button",
        },
        review: {},
        goalAchieved: false,
      };

      expect(result).toEqual(expectedResult);
      expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
        GOAL,
        VIEW_HIERARCHY,
        true,
        [],
        undefined,
      );
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
        GENERATED_PROMPT,
        SNAPSHOT_DATA,
      );
    });

    it("should perform an intent with undefined snapshot", async () => {
      setupMocks({ snapshotData: null });

      const result = await performer.analyseScreenAndCreatePilotStep(
        GOAL,
        [],
        mockCaptureResult,
      );

      const expectedResult = {
        screenDescription: "default name",
        plan: {
          thoughts: "I think this is great",
          action: "Tap on GREAT button",
        },
        review: {},
        goalAchieved: false,
      };

      expect(result).toEqual(expectedResult);
      expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
        GOAL,
        VIEW_HIERARCHY,
        false,
        [],
        undefined,
      );
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
        GENERATED_PROMPT,
        undefined,
      );
    });

    it("should perform an intent successfully with previous intents", async () => {
      const intent = "current intent";
      const previousIntents: AutoPreviousStep[] = [
        {
          screenDescription: "default",
          step: "previous intent",
          review: {},
        },
      ];

      setupMocks();

      const result = await performer.analyseScreenAndCreatePilotStep(
        intent,
        previousIntents,
        mockCaptureResult,
      );

      const expectedResult = {
        screenDescription: "default name",
        plan: {
          thoughts: "I think this is great",
          action: "Tap on GREAT button",
        },
        review: {},
        goalAchieved: false,
      };

      expect(result).toEqual(expectedResult);
      expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
        intent,
        VIEW_HIERARCHY,
        true,
        previousIntents,
        undefined,
      );
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
        GENERATED_PROMPT,
        SNAPSHOT_DATA,
      );
    });

    describe("perform", () => {
      it("should perform multiple steps until success is returned", async () => {
        const pilotOutputStep1: AutoStepReport = {
          screenDescription: "Screen 1",
          plan: {
            thoughts: "Step 1 thoughts",
            action: "Tap on GREAT button",
          },
          review: {},
          goalAchieved: false,
        };

        const pilotOutputSuccess: AutoStepReport = {
          screenDescription: "Screen 2",
          plan: {
            thoughts: "Completed successfully",
            action: "success",
          },
          review: {},
          goalAchieved: true,
          summary: "all was good",
        };

        jest
          .spyOn(extractTaggedOutputsModule, "extractAutoPilotStepOutputs")
          .mockReturnValueOnce({
            screenDescription: "Screen 2",
            thoughts: "Completed successfully",
            action: "success",
            goalSummary: "all was good",
          });

        const screenCapturerResult: ScreenCapturerResult = {
          snapshot: SNAPSHOT_DATA,
          viewHierarchy: VIEW_HIERARCHY,
        };

        // Mock capture to return ScreenCapturerResult on each call
        mockScreenCapturer.capture.mockResolvedValue(screenCapturerResult);

        // Mock analyseScreenAndCreateCopilotStep to return pilotOutputStep1, then pilotOutputSuccess
        const analyseScreenAndCreateCopilotStep = jest
          .spyOn(performer, "analyseScreenAndCreatePilotStep")
          .mockResolvedValueOnce(pilotOutputStep1)
          .mockResolvedValueOnce(pilotOutputSuccess);

        jest.spyOn(mockStepPerformer, "perform").mockResolvedValue({
          code: "code executed",
          result: "result of execution",
        });

        const result = await performer.perform(GOAL);

        expect(mockScreenCapturer.capture).toHaveBeenCalledTimes(3);
        expect(analyseScreenAndCreateCopilotStep).toHaveBeenCalledTimes(2);

        const expectedReport: AutoReport = {
          summary: "all was good",
          goal: GOAL,
          steps: [
            {
              screenDescription: "Screen 1",
              plan: pilotOutputStep1.plan,
              code: "code executed",
              review: pilotOutputStep1.review,
              goalAchieved: false,
            },
          ],
          review: {},
        };

        expect(result).toEqual(expectedReport);
      });
    });

    it("should use cached value result if available", async () => {
      setupMocks({ cacheExists: true });

      // Mock the findMatchingCacheEntry to return a valid cache entry
      mockCacheHandler.findMatchingCacheEntry.mockReturnValue({
        value: {
          screenDescription: "Screen 1",
          plan: undefined,
          review: undefined,
          goalAchieved: false,
          summary: "success",
        },
        snapshotHashes: { BlockHash: "hash" },
        creationTime: Date.now(),
      });

      const goal = GOAL;
      const previousSteps: AutoPreviousStep[] = [];
      const result = await performer.analyseScreenAndCreatePilotStep(
        goal,
        previousSteps,
        mockCaptureResult,
      );

      expect(mockCacheHandler.getFromPersistentCache).toHaveBeenCalledWith(
        JSON.stringify({
          goal: GOAL,
          previousSteps: [],
        }),
      );

      expect(mockSnapshotComparator.generateHashes).toHaveBeenCalled();
      expect(result.summary).toEqual("success");
      expect(result.goalAchieved).toEqual(false);
      expect(mockPromptCreator.createPrompt).not.toHaveBeenCalled();
    });

    it("should log cached review sections when using cached values", async () => {
      setupMocks({ cacheExists: true });

      const cachedReview = {
        UX: {
          summary: "Good UX design",
          findings: ["Button is well placed", "Clear navigation"],
          score: "8/10",
        },
        Accessibility: {
          summary: "Decent accessibility",
          findings: ["Some contrast issues", "Missing alt text"],
          score: "6/10",
        },
      };

      mockCacheHandler.findMatchingCacheEntry.mockReturnValue({
        value: {
          screenDescription: "Screen with reviews",
          plan: {
            thoughts: "Cached thoughts",
            action: "Cached action",
          },
          review: cachedReview,
          goalAchieved: false,
          summary: "cached summary",
        },
        snapshotHashes: { BlockHash: "hash" },
        creationTime: Date.now(),
      });

      const logReviewsSpy = jest.spyOn(performer as any, "logReviews");

      const result = await performer.analyseScreenAndCreatePilotStep(
        GOAL,
        [],
        mockCaptureResult,
        AUTOPILOT_REVIEW_DEFAULTS,
      );

      expect(logReviewsSpy).toHaveBeenCalledWith(
        "Screen with reviews",
        cachedReview,
        AUTOPILOT_REVIEW_DEFAULTS,
      );

      expect(result.review).toEqual(cachedReview);

      expect(mockCacheHandler.getFromPersistentCache).toHaveBeenCalled();
      expect(mockPromptCreator.createPrompt).not.toHaveBeenCalled();
    });

    it("should retry if analysis fails", async () => {
      setupMocks();
      const goal = GOAL;
      const previousSteps: AutoPreviousStep[] = [];
      mockPromptHandler.runPrompt.mockRejectedValueOnce(
        new Error("Failed to generate text"),
      );

      await performer.analyseScreenAndCreatePilotStep(
        goal,
        previousSteps,
        mockCaptureResult,
      );

      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(2);
      expect(mockPromptCreator.createPrompt).toHaveBeenCalledTimes(2);
    });

    it("should add error to previous step if analysis fails", async () => {
      setupMocks();
      const goal = GOAL;
      const previousSteps: AutoPreviousStep[] = [];
      mockPromptHandler.runPrompt.mockRejectedValueOnce(
        new Error("Failed to generate text"),
      );

      await performer.analyseScreenAndCreatePilotStep(
        goal,
        previousSteps,
        mockCaptureResult,
      );

      expect(mockPromptCreator.createPrompt).toHaveBeenNthCalledWith(
        2,
        goal,
        VIEW_HIERARCHY,
        true,
        [
          {
            screenDescription: "",
            step: "",
            error: expect.stringContaining("Failed to generate text"),
          },
        ],
        undefined,
      );
    });
  });
  describe("with review types", () => {
    it("should perform an intent successfully with snapshot image support with review", async () => {
      setupMocks();

      const result = await performer.analyseScreenAndCreatePilotStep(
        GOAL,
        [],
        mockCaptureResult,
        AUTOPILOT_REVIEW_DEFAULTS,
      );

      const expectedResult = {
        screenDescription: "default name",
        plan: {
          thoughts: "I think this is great",
          action: "Tap on GREAT button",
        },
        review: {
          UX: {
            summary: "The review of UX",
            findings: ["UX finding one", "UX finding two"],
            score: "7/10",
          },
          Accessibility: {
            summary: "The review of accessibility",
            findings: ["ACC finding one", "ACC finding two"],
            score: "8/10",
          },
          Internationalization: {
            summary: "The review of i18n",
            findings: ["i18n finding one", "i18n finding two"],
            score: "6/10",
          },
        },
        goalAchieved: false,
      };

      expect(result).toEqual(expectedResult);
      expect(mockPromptCreator.createPrompt).toHaveBeenCalledWith(
        GOAL,
        VIEW_HIERARCHY,
        true,
        [],
        AUTOPILOT_REVIEW_DEFAULTS,
      );
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
        GENERATED_PROMPT,
        SNAPSHOT_DATA,
      );
    });
  });
});
