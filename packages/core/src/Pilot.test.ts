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
      isSnapshotImageAttached: true,
    };

    jest.spyOn(console, "error").mockImplementation(() => {});

    ScreenCapturer.prototype.capture = jest
      .fn()
      .mockResolvedValue(screenCapture);
    (StepPerformer.prototype.perform as jest.Mock).mockResolvedValue({
      code: "code",
      result: true,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    (console.error as jest.Mock).mockRestore();
    (Pilot as any)["instance"] = undefined;
  });

  describe("getInstance", () => {
    it("should return the same instance after initialization", () => {
      Pilot.init(mockConfig);

      const instance1 = Pilot.getInstance();
      const instance2 = Pilot.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should throw PilotError if getInstance is called before init", () => {
      expect(() => Pilot.getInstance()).toThrow(
        "Pilot has not been initialized. Please call the `init()` method before using it.",
      );
    });
  });

  describe("init", () => {
    it("should create a new instance of Pilot", () => {
      Pilot.init(mockConfig);
      expect(Pilot.getInstance()).toBeInstanceOf(Pilot);
    });

    it("should throw an error when trying to initialize Pilot multiple times", () => {
      Pilot.init(mockConfig);

      expect(() => Pilot.init(mockConfig)).toThrow(
        "Pilot has already been initialized. Please call the `init()` method only once.",
      );
    });

    it("should throw an error if config is invalid", () => {
      const invalidConfig = {} as Config;

      expect(() => Pilot.init(invalidConfig)).toThrow();
    });
  });

  describe("isInitialized", () => {
    it("should return false before initialization", () => {
      expect(Pilot.isInitialized()).toBe(false);
    });

    it("should return true after initialization", () => {
      Pilot.init(mockConfig);

      expect(Pilot.isInitialized()).toBe(true);
    });
  });

  describe("performStep", () => {
    it("should call CopilotStepPerformer.perform with the given intent", async () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();
      instance.start();
      await instance.performStep(INTENT);

      expect(StepPerformer.prototype.perform).toHaveBeenCalledWith(
        INTENT,
        [],
        screenCapture,
      );
    });

    it("should return the result from CopilotStepPerformer.perform", async () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();
      instance.start();

      const result = await instance.performStep(INTENT);

      expect(result).toBe(true);
    });

    it("should accumulate previous steps", async () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();
      instance.start();
      const intent1 = "tap button 1";
      const intent2 = "tap button 2";

      await instance.performStep(intent1);
      await instance.performStep(intent2);

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
  });

  describe("start", () => {
    it("should clear previous steps", async () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();
      instance.start();
      const intent1 = "tap button 1";
      const intent2 = "tap button 2";

      await instance.performStep(intent1);
      instance.end(true);
      instance.start();
      await instance.performStep(intent2);

      expect(StepPerformer.prototype.perform).toHaveBeenLastCalledWith(
        intent2,
        [],
        screenCapture,
      );
    });
  });

  describe("start and end behavior", () => {
    it("should not performStep before start", async () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();

      await expect(instance.performStep(INTENT)).rejects.toThrowError(
        "Pilot is not running. Please call the `start()` method before performing a test step.",
      );
    });

    it("should not start without ending the previous flow (start->start)", async () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();
      instance.start();

      await instance.performStep(INTENT);

      expect(() => instance.start()).toThrowError(
        "Pilot was already started. Please call the `end()` method before starting a new test flow.",
      );
    });

    it("should not end without starting a new flow (end->end)", () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();
      instance.start();

      instance.end(true);

      expect(() => instance.end(true)).toThrowError(
        "Pilot is not running. Please call the `start()` method before ending the test flow.",
      );
    });
  });

  describe("end", () => {
    it("end with shouldSaveToCache=false should not save to cache", async () => {
      mockCache();

      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();
      instance.start();

      await instance.performStep(INTENT);
      instance.end(false);

      expect(mockedCacheFile).toBeUndefined();
    });
  });

  describe("extend API catalog", () => {
    it("should extend the API catalog with a new category", () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();

      const spyCopilotStepPerformer = jest.spyOn(
        instance["stepPerformer"],
        "extendJSContext",
      );

      instance.extendAPICatalog([barCategory1]);

      expect(mockConfig.frameworkDriver.apiCatalog.categories).toEqual([
        barCategory1,
      ]);
      expect(spyCopilotStepPerformer).not.toHaveBeenCalled();
    });

    it("should extend the API catalog with a new category and context", () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();

      const spyCopilotStepPerformer = jest.spyOn(
        instance["stepPerformer"],
        "extendJSContext",
      );

      instance.extendAPICatalog([barCategory1], dummyContext);

      expect(mockConfig.frameworkDriver.apiCatalog.categories).toEqual([
        barCategory1,
      ]);
      expect(spyCopilotStepPerformer).toHaveBeenCalledWith(dummyContext);
    });

    it("should extend the API catalog with an existing category", () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();

      const spyCopilotStepPerformer = jest.spyOn(
        instance["stepPerformer"],
        "extendJSContext",
      );

      instance.extendAPICatalog([barCategory1]);
      instance.extendAPICatalog([barCategory2], dummyContext);

      expect(mockConfig.frameworkDriver.apiCatalog.categories.length).toEqual(
        1,
      );
      expect(mockConfig.frameworkDriver.apiCatalog.categories[0].items).toEqual(
        [...barCategory1.items, ...barCategory2.items],
      );
      expect(spyCopilotStepPerformer).toHaveBeenCalledWith(dummyContext);
    });

    it("should extend the API catalog with multiple categories sequentially", () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();

      instance.extendAPICatalog([barCategory1]);
      instance.extendAPICatalog([bazCategory]);

      expect(mockConfig.frameworkDriver.apiCatalog.categories).toEqual([
        barCategory1,
        bazCategory,
      ]);
    });

    it("should pilot through steps successfully", async () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();
      const goal = "test goal";
      instance.start();

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

      const pilotResult = await instance.autopilot(goal);

      expect(instance["autoPerformer"].perform).toHaveBeenCalledWith(goal);
      expect(pilotResult).toEqual(mockPilotResult);
    });
  });

  describe("pilot", () => {
    it("should perform an entire test flow using the provided goal", async () => {
      Pilot.init(mockConfig);
      const instance = Pilot.getInstance();
      const goal = "Test the login flow";
      instance.start();

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

      jest.spyOn(instance["autoPerformer"], "perform").mockResolvedValue({
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
      });

      const result = await instance.autopilot(goal);

      expect(instance["autoPerformer"].perform).toHaveBeenCalledWith(goal);
      expect(result).toEqual({
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
      });
    });
  });
});
