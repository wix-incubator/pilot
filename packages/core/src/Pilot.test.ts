import { Pilot } from "@/Pilot";
import { StepPerformer } from "@/performers/step-performer/StepPerformer";
import {
  Config,
  ScreenCapturerResult,
  PromptHandler,
  AutoStepReport,
} from "@/types";
import { mockCache, mockedCacheFile } from "./test-utils/cache";
import { ScreenCapturer } from "@/common/snapshot/ScreenCapturer";
import {
  bazCategory,
  barCategory2,
  barCategory1,
  dummyContext,
} from "./test-utils/APICatalogTestUtils";
import { AutoPerformer } from "./performers/auto-performer/AutoPerformer";

jest.mock("@/performers/step-performer/StepPerformer");
jest.mock("@/common/snapshot/ScreenCapturer");
jest.mock("fs");

const INTENT = "tap button";

describe("Pilot", () => {
  let mockConfig: Config;
  let mockPromptHandler: jest.Mocked<PromptHandler>;
  let mockFrameworkDriver: any;
  let mockPilotPerformer: jest.Mocked<AutoPerformer>;
  let screenCapture: ScreenCapturerResult;
  let pilot: Pilot;

  beforeEach(() => {
    mockPromptHandler = {
      runPrompt: jest.fn(),
      isSnapshotImageSupported: jest.fn(),
    } as any;

    mockFrameworkDriver = {
      apiCatalog: {
        context: {},
        categories: [],
      },
      captureSnapshotImage: jest.fn(),
      captureViewHierarchyString: jest.fn(),
    };

    mockPilotPerformer = {
      perform: jest.fn(),
    } as any;

    mockConfig = {
      promptHandler: mockPromptHandler,
      frameworkDriver: mockFrameworkDriver,
    };

    jest
      .spyOn(AutoPerformer.prototype, "perform")
      .mockImplementation(mockPilotPerformer.perform);

    screenCapture = {
      snapshot: "base64-encoded-image",
      viewHierarchy: '<View><Button title="Login" /></View>',
    };

    jest.spyOn(console, "error").mockImplementation(() => {});

    ScreenCapturer.prototype.capture = jest
      .fn()
      .mockResolvedValue(screenCapture);
    (StepPerformer.prototype.perform as jest.Mock).mockResolvedValue({
      code: "code",
      result: true,
    });

    // Create a new pilot instance for each test
    pilot = new Pilot(mockConfig);
  });

  afterEach(() => {
    jest.resetAllMocks();
    (console.error as jest.Mock).mockRestore();
  });

  describe("perform", () => {
    it("should call StepPerformer.perform with the given intent", async () => {
      pilot.start();
      await pilot.perform(INTENT);

      expect(StepPerformer.prototype.perform).toHaveBeenCalledWith(
        INTENT,
        [],
        screenCapture,
      );
    });

    it("should return the result from StepPerformer.perform", async () => {
      pilot.start();

      const result = await pilot.perform(INTENT);

      expect(result).toBe(true);
    });

    it("should accumulate previous steps", async () => {
      pilot.start();
      const intent1 = "tap button 1";
      const intent2 = "tap button 2";

      await pilot.perform(intent1);
      await pilot.perform(intent2);

      expect(StepPerformer.prototype.perform).toHaveBeenLastCalledWith(
        intent2,
        [
          {
            step: intent1,
            code: "code",
            result: true,
          },
        ],
        screenCapture,
      );
    });

    it("should handle multiple steps in a single call", async () => {
      pilot.start();
      const intent1 = "tap button 1";
      const intent2 = "tap button 2";

      await pilot.perform(intent1, intent2);

      expect(StepPerformer.prototype.perform).toHaveBeenCalledTimes(2);
      expect(StepPerformer.prototype.perform).toHaveBeenNthCalledWith(
        1,
        intent1,
        [],
        screenCapture,
      );
      expect(StepPerformer.prototype.perform).toHaveBeenNthCalledWith(
        2,
        intent2,
        [
          {
            step: intent1,
            code: "code",
            result: true,
          },
        ],
        screenCapture,
      );
    });
  });

  describe("start", () => {
    it("should clear previous steps", async () => {
      pilot.start();
      const intent1 = "tap button 1";
      const intent2 = "tap button 2";

      await pilot.perform(intent1);
      pilot.end(true);
      pilot.start();
      await pilot.perform(intent2);

      expect(StepPerformer.prototype.perform).toHaveBeenLastCalledWith(
        intent2,
        [],
        screenCapture,
      );
    });
  });

  describe("start and end behavior", () => {
    it("should not perform steps before start", async () => {
      await expect(pilot.perform(INTENT)).rejects.toThrowError(
        "Pilot is not running. Please call the `start()` method before performing a test step.",
      );
    });

    it("should not start without ending the previous flow (start->start)", async () => {
      pilot.start();

      await pilot.perform(INTENT);

      expect(() => pilot.start()).toThrowError(
        "Pilot was already started. Please call the `end()` method before starting a new test flow.",
      );
    });

    it("should not end without starting a new flow (end->end)", () => {
      pilot.start();

      pilot.end(true);

      expect(() => pilot.end(true)).toThrowError(
        "Pilot is not running. Please call the `start()` method before ending the test flow.",
      );
    });
  });

  describe("end", () => {
    it("end with shouldSaveToCache=false should not save to cache", async () => {
      mockCache();

      pilot.start();

      await pilot.perform(INTENT);
      pilot.end(false);

      expect(mockedCacheFile).toBeUndefined();
    });
  });

  describe("extend API catalog", () => {
    it("should extend the API catalog with a new category", () => {
      const spyCopilotStepPerformer = jest.spyOn(
        pilot["stepPerformer"],
        "extendJSContext",
      );

      pilot.extendAPICatalog([barCategory1]);

      expect(mockConfig.frameworkDriver.apiCatalog.categories).toEqual([
        barCategory1,
      ]);
      expect(spyCopilotStepPerformer).not.toHaveBeenCalled();
    });

    it("should extend the API catalog with a new category and context", () => {
      const spyCopilotStepPerformer = jest.spyOn(
        pilot["stepPerformer"],
        "extendJSContext",
      );

      pilot.extendAPICatalog([barCategory1], dummyContext);

      expect(mockConfig.frameworkDriver.apiCatalog.categories).toEqual([
        barCategory1,
      ]);
      expect(spyCopilotStepPerformer).toHaveBeenCalledWith(dummyContext);
    });

    it("should extend the API catalog with an existing category", () => {
      const spyCopilotStepPerformer = jest.spyOn(
        pilot["stepPerformer"],
        "extendJSContext",
      );

      pilot.extendAPICatalog([barCategory1]);
      pilot.extendAPICatalog([barCategory2], dummyContext);

      expect(mockConfig.frameworkDriver.apiCatalog.categories.length).toEqual(
        1,
      );
      expect(mockConfig.frameworkDriver.apiCatalog.categories[0].items).toEqual(
        [...barCategory1.items, ...barCategory2.items],
      );
      expect(spyCopilotStepPerformer).toHaveBeenCalledWith(dummyContext);
    });

    it("should extend the API catalog with multiple categories sequentially", () => {
      pilot.extendAPICatalog([barCategory1]);
      pilot.extendAPICatalog([bazCategory]);

      expect(mockConfig.frameworkDriver.apiCatalog.categories).toEqual([
        barCategory1,
        bazCategory,
      ]);
    });
  });

  describe("autopilot", () => {
    it("should execute an entire test flow using the provided goal", async () => {
      const goal = "test goal";
      pilot.start();

      const mockPilotResult = {
        summary: "Test completed successfully",
        goal,
        steps: [
          {
            screenDescription: "Screen 1",
            plan: {
              thoughts: "Step 1 thoughts",
              action: "Tap on GREAT button",
            },
            code: "code executed",
            goalAchieved: false,
          },
          {
            screenDescription: "Screen 2",
            plan: {
              thoughts: "Completed successfully",
              action: "success",
            },
            goalAchieved: true,
          },
        ],
      };

      mockPilotPerformer.perform.mockResolvedValue(mockPilotResult);

      const pilotResult = await pilot.autopilot(goal);

      expect(pilot["autoPerformer"].perform).toHaveBeenCalledWith(
        goal,
        undefined,
      );
      expect(pilotResult).toEqual(mockPilotResult);
    });
  });

  describe("autopilot with reviews", () => {
    it("should perform an entire test flow using the provided goal and include reviews", async () => {
      const goal = "Test the login flow";
      pilot.start();

      const pilotOutputStep1: AutoStepReport = {
        screenDescription: "Login Screen",
        plan: {
          thoughts: "Step 1 thoughts",
          action: "Tap on Login button",
        },
        review: {
          ux: {
            summary: "UX review for step 1",
            findings: [],
            score: "7/10",
          },
          a11y: {
            summary: "Accessibility review for step 1",
            findings: [],
            score: "8/10",
          },
        },
        goalAchieved: false,
      };

      const pilotOutputSuccess: AutoStepReport = {
        screenDescription: "Home Screen",
        plan: {
          thoughts: "Completed successfully",
          action: "success",
        },
        review: {
          ux: {
            summary: "Final UX review",
            findings: [],
            score: "9/10",
          },
          a11y: {
            summary: "Final Accessibility review",
            findings: [],
            score: "9/10",
          },
        },
        goalAchieved: true,
        summary: "All was good",
      };

      const expectedResult = {
        summary: pilotOutputSuccess.summary,
        goal: goal,
        steps: [
          {
            screenDescription: pilotOutputStep1.screenDescription,
            plan: pilotOutputStep1.plan,
            code: "code executed",
            review: pilotOutputStep1.review,
            goalAchieved: pilotOutputStep1.goalAchieved,
          },
        ],
        review: pilotOutputSuccess.review,
      };

      jest
        .spyOn(pilot["autoPerformer"], "perform")
        .mockResolvedValue(expectedResult);

      const result = await pilot.autopilot(goal);

      expect(pilot["autoPerformer"].perform).toHaveBeenCalledWith(
        goal,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
