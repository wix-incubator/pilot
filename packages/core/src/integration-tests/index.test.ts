import { Pilot } from "@/Pilot";
import fs from "fs";
import {
  PromptHandler,
  TestingFrameworkDriver,
  AutoReport,
  CacheValue,
} from "@/types";
import { mockedCacheFile, mockCache } from "@/test-utils/cache";
import { StepPerformerPromptCreator } from "@/performers/step-performer/StepPerformerPromptCreator";
import { StepPerformer } from "@/performers/step-performer/StepPerformer";
import {
  bazCategory,
  barCategory1,
  dummyContext,
} from "@/test-utils/APICatalogTestUtils";
import { getSnapshotImage } from "@/test-utils/SnapshotComparatorTestImages/SnapshotImageGetter";

jest.mock("crypto");
jest.mock("fs");

const CACHE_VALIDATION_TAG =
  "<CACHE_VALIDATION_MATCHER></CACHE_VALIDATION_MATCHER>";
const CACHE_VALIDATION_CODE = "verify button exists";

describe("Pilot Integration Tests", () => {
  let mockFrameworkDriver: jest.Mocked<TestingFrameworkDriver>;
  let mockPromptHandler: jest.Mocked<PromptHandler>;
  let pilot: Pilot;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockFrameworkDriver = {
      captureSnapshotImage: jest
        .fn()
        .mockResolvedValue(getSnapshotImage("baseline")),
      captureViewHierarchyString: jest
        .fn()
        .mockResolvedValue("<view><button>Login</button></view>"),
      apiCatalog: {
        context: {},
        categories: [],
      },
      driverConfig: { useSnapshotStabilitySync: true },
    };

    mockPromptHandler = {
      runPrompt: jest.fn(),
      isSnapshotImageSupported: jest.fn().mockReturnValue(true),
    };

    mockCache();

    pilot = new Pilot({
      frameworkDriver: mockFrameworkDriver,
      promptHandler: mockPromptHandler,
    });
  });

  describe("Basic Operations", () => {
    it("should be properly instantiated", () => {
      expect(pilot).toBeInstanceOf(Pilot);
    });
  });

  describe("Single Step Operations", () => {
    beforeEach(() => {
      pilot.start();
    });

    it("should successfully perform an action", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>// No operation</CODE>${CACHE_VALIDATION_TAG}`,
      );
      await expect(
        pilot.perform("Tap on the login button"),
      ).resolves.not.toThrow();

      expect(mockFrameworkDriver.captureSnapshotImage).toHaveBeenCalled();
      expect(mockFrameworkDriver.captureViewHierarchyString).toHaveBeenCalled();
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
        expect.stringContaining("Tap on the login button"),
        getSnapshotImage("baseline"),
      );
    });

    it("should successfully perform an assertion", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>// No operation</CODE>${CACHE_VALIDATION_TAG}`,
      );

      await expect(
        pilot.perform("The welcome message should be visible"),
      ).resolves.not.toThrow();

      expect(mockFrameworkDriver.captureSnapshotImage).toHaveBeenCalled();
      expect(mockFrameworkDriver.captureViewHierarchyString).toHaveBeenCalled();
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
        expect.stringContaining("The welcome message should be visible"),
        getSnapshotImage("baseline"),
      );
    });

    it("should handle errors during action execution", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>throw new Error("Element not found")</CODE>${CACHE_VALIDATION_TAG}`,
      );
      await expect(
        pilot.perform("Tap on a non-existent button"),
      ).rejects.toThrow("Element not found");
    });

    it("should handle errors during assertion execution", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>throw new Error("Element not found")</CODE>${CACHE_VALIDATION_TAG}`,
      );

      await expect(
        pilot.perform("The welcome message should be visible"),
      ).rejects.toThrow("Element not found");
    });

    it("should handle errors during code evaluation", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>foobar</CODE>${CACHE_VALIDATION_TAG}`,
      );

      await expect(
        pilot.perform("The welcome message should be visible"),
      ).rejects.toThrow(/foobar is not defined/);
    });
  });

  describe("Multiple Step Operations", () => {
    beforeEach(() => {
      pilot.start();
    });

    it("should perform multiple steps using spread operator", async () => {
      mockPromptHandler.runPrompt
        .mockResolvedValueOnce(
          `<CODE>// Tap login button</CODE>${CACHE_VALIDATION_TAG}`,
        )
        .mockResolvedValueOnce(
          `<CODE>// Enter username</CODE>${CACHE_VALIDATION_TAG}`,
        )
        .mockResolvedValueOnce(
          `<CODE>// Enter password</CODE>${CACHE_VALIDATION_TAG}`,
        );

      await pilot.perform(
        "Tap on the login button",
        'Enter username "testuser"',
        'Enter password "password123"',
      );

      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(3);
      expect(mockFrameworkDriver.captureSnapshotImage).toHaveBeenCalledTimes(6);
      expect(
        mockFrameworkDriver.captureViewHierarchyString,
      ).toHaveBeenCalledTimes(3);
    });

    it("should handle errors in multiple steps and stop execution", async () => {
      mockPromptHandler.runPrompt
        .mockResolvedValueOnce(
          `<CODE>// Tap login button</CODE>${CACHE_VALIDATION_TAG}`,
        )
        .mockResolvedValueOnce(
          `<CODE>throw new Error("Username field not found");</CODE>${CACHE_VALIDATION_TAG}`,
        )
        .mockResolvedValueOnce(
          `<CODE>throw new Error("Username field not found - second");</CODE>${CACHE_VALIDATION_TAG}`,
        )
        .mockResolvedValueOnce(
          `<CODE>// Enter password</CODE>${CACHE_VALIDATION_TAG}`,
        );

      await expect(
        pilot.perform(
          "Tap on the login button",
          'Enter username "testuser"',
          'Enter password "password123"',
        ),
      ).rejects.toThrow("Username field not found");

      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(3);
      expect(mockFrameworkDriver.captureSnapshotImage).toHaveBeenCalledTimes(6);
      expect(
        mockFrameworkDriver.captureViewHierarchyString,
      ).toHaveBeenCalledTimes(3);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      pilot.start();
    });

    it("should throw error when PromptHandler fails", async () => {
      mockPromptHandler.runPrompt.mockRejectedValue(new Error("API error"));

      await expect(pilot.perform("Perform action")).rejects.toThrow(
        "API error",
      );
    });

    it("should throw error when captureSnapshotImage() fails", async () => {
      mockFrameworkDriver.captureSnapshotImage.mockRejectedValue(
        new Error("Snapshot error"),
      );

      await expect(pilot.perform("Perform action")).rejects.toThrow(
        "Snapshot error",
      );
    });

    it("should throw error when captureViewHierarchyString() fails", async () => {
      mockFrameworkDriver.captureViewHierarchyString.mockRejectedValue(
        new Error("Hierarchy error"),
      );

      await expect(pilot.perform("Perform action")).rejects.toThrow(
        "Hierarchy error",
      );
    });
  });

  describe("Context Management", () => {
    beforeEach(() => {
      pilot.start();
    });

    it("should reset context when end is called", async () => {
      mockPromptHandler.runPrompt.mockResolvedValueOnce(
        `<CODE>// Login action</CODE>${CACHE_VALIDATION_TAG}`,
      );
      await pilot.perform("Log in to the application");

      pilot.end();
      pilot.start();

      mockPromptHandler.runPrompt.mockResolvedValueOnce(
        `<CODE>// New action after reset </CODE>${CACHE_VALIDATION_TAG}`,
      );
      await pilot.perform("Perform action after reset");

      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(2);
      expect(mockPromptHandler.runPrompt.mock.calls[1][0]).not.toContain(
        "Log in to the application",
      );
    });

    it("should clear conversation history on reset", async () => {
      mockPromptHandler.runPrompt
        .mockResolvedValueOnce(
          `<CODE>// Action 1</CODE>${CACHE_VALIDATION_TAG}`,
        )
        .mockResolvedValueOnce(
          `<CODE>// Action 2</CODE>${CACHE_VALIDATION_TAG}`,
        );

      await pilot.perform("Action 1");
      await pilot.perform("Action 2");

      const lastCallArgsBeforeReset =
        mockPromptHandler.runPrompt.mock.calls[1][0];
      expect(lastCallArgsBeforeReset).toContain("Action 1");
      expect(lastCallArgsBeforeReset).toContain("Action 2");

      pilot.end();
      pilot.start();

      mockPromptHandler.runPrompt.mockResolvedValueOnce(
        `<CODE>// New action</CODE>${CACHE_VALIDATION_TAG}`,
      );
      await pilot.perform("New action after reset");

      const lastCallArgsAfterReset =
        mockPromptHandler.runPrompt.mock.calls[2][0];
      expect(lastCallArgsAfterReset).not.toContain("Action 1");
      expect(lastCallArgsAfterReset).not.toContain("Action 2");
      expect(lastCallArgsAfterReset).toContain("New action after reset");
    });
  });

  describe("Caching Behavior", () => {
    beforeEach(() => {
      // Create a new pilot instance with default cache options
      pilot = new Pilot({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      pilot.start();
    });

    it("should create cache file if it does not exist", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>// Perform action</CODE>${CACHE_VALIDATION_TAG}`,
      );

      await pilot.perform("Perform action");
      pilot.end(true);

      expect(mockedCacheFile).toEqual({
        '{"currentStep":"Perform action","previousSteps":[]}':
          expect.arrayContaining([
            expect.objectContaining({
              value: {
                code: "// Perform action",
              },
              validationMatcher: "No cache validation matcher found",
            }),
          ]),
      });
    });

    it("should use snapshot cache if available", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>// New action code</CODE><CACHE_VALIDATION_MATCHER></CACHE_VALIDATION_MATCHER>`,
      );
      mockCache({
        '{"currentStep":"Cached action","previousSteps":[]}': [
          {
            value: {
              code: "// Cached action code",
            },
            validationMatcher: CACHE_VALIDATION_CODE,
            creationTime: Date.now(),
          },
        ],
      });

      // restart pilot to reload cache file
      pilot.end();
      pilot.start();

      await pilot.perform("Cached action");

      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(1);
    });

    it("should update cache file after performing new action", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>// New action code</CODE><CACHE_VALIDATION_MATCHER></CACHE_VALIDATION_MATCHER>`,
      );

      await pilot.perform("New action");
      pilot.end();

      expect(mockedCacheFile).toEqual({
        '{"currentStep":"New action","previousSteps":[]}': [
          expect.objectContaining({
            value: {
              code: "// New action code",
            },
            validationMatcher: "No cache validation matcher found",
          }),
        ],
      });
    });

    it("should handle fs.readFileSync errors", async () => {
      mockCache({}); // Set up an initial mocked file
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Read error");
      });
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>// New action code</CODE>${CACHE_VALIDATION_TAG}`,
      );

      await pilot.perform("Action with read error");

      expect(mockPromptHandler.runPrompt).toHaveBeenCalled();
    });

    it("should handle fs.writeFileSync errors", async () => {
      mockCache(undefined); // No mocked file exists
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Write error");
      });
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>// Action code</CODE>${CACHE_VALIDATION_TAG}`,
      );

      await expect(
        pilot.perform("Action with write error"),
      ).resolves.not.toThrow();
    });

    it("should add error and not add result for next perform step", async () => {
      let promptParam: string = "";
      mockPromptHandler.runPrompt
        .mockResolvedValueOnce(
          `<CODE>throw new Error("Element not found");</CODE>${CACHE_VALIDATION_TAG}`,
        )
        .mockImplementationOnce((prompt, _snapshot) => {
          promptParam = prompt;
          return Promise.resolve(
            `<CODE>// No operation</CODE>${CACHE_VALIDATION_TAG}`,
          );
        });

      await pilot.perform("Tap on a non-existent button");

      expect(promptParam).toContain("Element not found");
      expect(promptParam).toMatchSnapshot();
    });
  });

  describe("Feature Support", () => {
    beforeEach(() => {
      // Create a new instance for each test
      pilot = new Pilot({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      pilot.start();
    });

    it("should work without snapshot images when not supported", async () => {
      mockPromptHandler.isSnapshotImageSupported.mockReturnValue(false);
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>// Perform action without snapshot</CODE>${CACHE_VALIDATION_TAG}`,
      );

      await pilot.perform("Perform action without snapshot support");

      expect(mockFrameworkDriver.captureSnapshotImage).not.toHaveBeenCalled();
      expect(mockFrameworkDriver.captureViewHierarchyString).toHaveBeenCalled();
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
        expect.stringContaining("Perform action without snapshot support"),
        undefined,
      );
    });
  });

  describe("API Catalog Extension", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Create new pilot instance
      pilot = new Pilot({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      pilot.start();
    });

    it("should call relevant functions to extend the catalog", () => {
      const spyPromptCreator = jest.spyOn(
        StepPerformerPromptCreator.prototype,
        "extendAPICategories",
      );
      const spyStepPerformer = jest.spyOn(
        StepPerformer.prototype,
        "extendJSContext",
      );

      pilot.extendAPICatalog([bazCategory]);
      expect(spyPromptCreator).toHaveBeenCalledTimes(1);

      pilot.extendAPICatalog([barCategory1], dummyContext);
      expect(spyPromptCreator).toHaveBeenCalledTimes(2);
      expect(spyStepPerformer).toHaveBeenCalledTimes(1);
    });
  });

  describe("Autopilot Method", () => {
    beforeEach(() => {
      jest.clearAllMocks();

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
        driverConfig: { useSnapshotStabilitySync: true },
      };

      // Use the standard pilot instance
      pilot = new Pilot({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      pilot.start();
    });

    it("should perform autopilot flow and return a pilot report", async () => {
      const goal = "Complete the login flow";
      const mockPilotReport: AutoReport = {
        summary: "All steps completed successfully",
        goal: goal,
        steps: [
          {
            screenDescription: "Login Screen",
            plan: {
              thoughts: "First step thoughts",
              action: "Tap on login button",
            },
            code: "First step code output",
            review: {
              ux: {
                summary: "UX review for first step",
                findings: [],
                score: "7/10",
              },
              a11y: {
                summary: "Accessibility review for first step",
                findings: [],
                score: "8/10",
              },
            },
            goalAchieved: true,
          },
        ],
        review: {
          ux: {
            summary: "Overall UX review",
            findings: [],
            score: "9/10",
          },
          a11y: {
            summary: "Overall Accessibility review",
            findings: [],
            score: "9/10",
          },
        },
      };

      const spyPilotPerformerPerform = jest
        .spyOn(pilot["autoPerformer"], "perform")
        .mockResolvedValue(mockPilotReport);

      const result = await pilot.autopilot(goal);

      expect(spyPilotPerformerPerform).toHaveBeenCalledTimes(1);
      expect(spyPilotPerformerPerform).toHaveBeenCalledWith(goal, undefined);
      expect(result).toEqual(mockPilotReport);
    });

    it("should handle errors from autoPerformer.perform", async () => {
      const goal = "Some goal that causes an error";
      const errorMessage = "Error during autopilot execution";

      const spyPilotPerformerPerform = jest
        .spyOn(pilot["autoPerformer"], "perform")
        .mockRejectedValue(new Error(errorMessage));

      await expect(pilot.autopilot(goal)).rejects.toThrow(errorMessage);

      expect(spyPilotPerformerPerform).toHaveBeenCalledTimes(1);
      expect(spyPilotPerformerPerform).toHaveBeenCalledWith(goal, undefined);
    });
  });

  describe("Cache Modes", () => {
    beforeEach(() => {
      mockPromptHandler.runPrompt.mockResolvedValue(
        `<CODE>// No operation</CODE>${CACHE_VALIDATION_TAG}`,
      );
    });

    it("should use cache by default", async () => {
      // Create a new instance with default cache options
      const cachePilot = new Pilot({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      cachePilot.start();

      await cachePilot.perform("Tap on the login button");
      cachePilot.end();

      const firstCacheValue = Object.values(
        (mockedCacheFile as Record<string, CacheValue<any>[]>) || {},
      )[0][0];

      expect(firstCacheValue).toHaveProperty("validationMatcher");
      expect(firstCacheValue).toHaveProperty("value");
    });

    it("should not use cache when cache mode is disabled", async () => {
      // Create a new instance with cache disabled
      const noCachePilot = new Pilot({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
        options: {
          cacheOptions: { shouldUseCache: false },
        },
      });
      noCachePilot.start();

      // First call
      await noCachePilot.perform("Tap on the login button");
      noCachePilot.end();

      // Second call with same intent
      noCachePilot.start();
      await noCachePilot.perform("Tap on the login button");
      noCachePilot.end();

      // Should call runPrompt twice since cache is disabled
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(2);
    });
  });
});
