import pilot from "@/index";
import fs from "fs";
import { Pilot } from "@/Pilot";
import {
  PromptHandler,
  TestingFrameworkDriver,
  AutoReport,
  CacheValues,
  SnapshotHashObject,
} from "@/types";
import * as crypto from "crypto";
import { mockedCacheFile, mockCache } from "@/test-utils/cache";
import { StepPerformerPromptCreator } from "@/performers/step-performer/StepPerformerPromptCreator";
import { StepPerformer } from "@/performers/step-performer/StepPerformer";
import {
  bazCategory,
  barCategory1,
  dummyContext,
} from "@/test-utils/APICatalogTestUtils";
import { getSnapshotImage } from "@/test-utils/SnapshotComparatorTestImages/SnapshotImageGetter";
import { SnapshotComparator } from "@/common/snapshot/comparator/SnapshotComparator";

jest.mock("crypto");
jest.mock("fs");

describe("Pilot Integration Tests", () => {
  let mockedCachedSnapshotHash: SnapshotHashObject;
  let mockFrameworkDriver: jest.Mocked<TestingFrameworkDriver>;
  let mockPromptHandler: jest.Mocked<PromptHandler>;

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
    };

    mockPromptHandler = {
      runPrompt: jest.fn(),
      isSnapshotImageSupported: jest.fn().mockReturnValue(true),
    };

    mockedCachedSnapshotHash = await new SnapshotComparator().generateHashes(
      getSnapshotImage("baseline"),
    );

    mockCache();

    (crypto.createHash as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnValue({
        digest: jest.fn().mockReturnValue("hash"),
      }),
    });
  });

  afterEach(() => {
    // It's generally not recommended to directly access private properties,
    // but since Pilot is a singleton, we need to reset it between tests.
    // If possible, consider adding a public reset method to the Pilot class.
    (Pilot as any).instance = undefined;
  });

  describe("Initialization", () => {
    it("should throw an error when perform is called before initialization", async () => {
      await expect(pilot.perform("Some action")).rejects.toThrow();
    });

    it("should initialize successfully", () => {
      expect(() => {
        pilot.init({
          frameworkDriver: mockFrameworkDriver,
          promptHandler: mockPromptHandler,
        });
      }).not.toThrow();
    });

    it("should return false when isInitialized is called before initialization", () => {
      expect(pilot.isInitialized()).toBe(false);
    });

    it("should return true when isInitialized is called after initialization", () => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });

      expect(pilot.isInitialized()).toBe(true);
    });
  });

  describe("Single Step Operations", () => {
    beforeEach(() => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      pilot.start();
    });

    it("should successfully perform an action", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue("// No operation");
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
      mockPromptHandler.runPrompt.mockResolvedValue("// No operation");

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
        'throw new Error("Element not found");',
      );

      await expect(
        pilot.perform("Tap on a non-existent button"),
      ).rejects.toThrow("Element not found");
    });

    it("should handle errors during assertion execution", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue(
        'throw new Error("Element not found");',
      );

      await expect(
        pilot.perform("The welcome message should be visible"),
      ).rejects.toThrow("Element not found");
    });

    it("should handle errors during code evaluation", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue("foobar");

      await expect(
        pilot.perform("The welcome message should be visible"),
      ).rejects.toThrow(/foobar is not defined/);
    });
  });

  describe("Multiple Step Operations", () => {
    beforeEach(() => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      pilot.start();
    });

    it("should perform multiple steps using spread operator", async () => {
      mockPromptHandler.runPrompt
        .mockResolvedValueOnce("// Tap login button")
        .mockResolvedValueOnce("// Enter username")
        .mockResolvedValueOnce("// Enter password");

      await pilot.perform(
        "Tap on the login button",
        'Enter username "testuser"',
        'Enter password "password123"',
      );

      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(3);
      expect(mockFrameworkDriver.captureSnapshotImage).toHaveBeenCalledTimes(6);
      expect(
        mockFrameworkDriver.captureViewHierarchyString,
      ).toHaveBeenCalledTimes(6);
    });

    it("should handle errors in multiple steps and stop execution", async () => {
      mockPromptHandler.runPrompt
        .mockResolvedValueOnce("// Tap login button")
        .mockResolvedValueOnce('throw new Error("Username field not found");')
        .mockResolvedValueOnce(
          'throw new Error("Username field not found - second");',
        )
        .mockResolvedValueOnce("// Enter password");

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
      ).toHaveBeenCalledTimes(6);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
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
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      pilot.start();
    });

    it("should reset context when end is called", async () => {
      mockPromptHandler.runPrompt.mockResolvedValueOnce("// Login action");
      await pilot.perform("Log in to the application");

      pilot.end();
      pilot.start();

      mockPromptHandler.runPrompt.mockResolvedValueOnce(
        "// New action after reset",
      );
      await pilot.perform("Perform action after reset");

      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(2);
      expect(mockPromptHandler.runPrompt.mock.calls[1][0]).not.toContain(
        "Log in to the application",
      );
    });

    it("should clear conversation history on reset", async () => {
      mockPromptHandler.runPrompt
        .mockResolvedValueOnce("// Action 1")
        .mockResolvedValueOnce("// Action 2");

      await pilot.perform("Action 1");
      await pilot.perform("Action 2");

      const lastCallArgsBeforeReset =
        mockPromptHandler.runPrompt.mock.calls[1][0];
      expect(lastCallArgsBeforeReset).toContain("Action 1");
      expect(lastCallArgsBeforeReset).toContain("Action 2");

      pilot.end();
      pilot.start();

      mockPromptHandler.runPrompt.mockResolvedValueOnce("// New action");
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
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      pilot.start();
    });

    it("should create cache file if it does not exist", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue("// Perform action");

      await pilot.perform("Perform action");
      pilot.end(false);

      expect(mockedCacheFile).toEqual({
        '{"step":"Perform action","previous":[]}': expect.arrayContaining([
          expect.objectContaining({
            code: "// Perform action",
            snapshotHash: expect.any(Object),
            viewHierarchy: expect.any(String),
          }),
        ]),
      });
    });

    it("should read from existing cache file", async () => {
      mockCache({
        '{"step":"Cached action","previous":[]}': [
          { code: "// Cached action code", viewHierarchy: "hash" },
        ],
      });

      await pilot.perform("Cached action");

      expect(mockPromptHandler.runPrompt).not.toHaveBeenCalled();
    });

    it("should use snapshot cache if available", async () => {
      mockCache({
        '{"step":"Cached action","previous":[]}': [
          {
            code: "// Cached action code",
            viewHierarchy: "WrongHash",
            snapshotHash: mockedCachedSnapshotHash,
          },
        ],
      });

      await pilot.perform("Cached action");

      expect(mockPromptHandler.runPrompt).not.toHaveBeenCalled();
    });

    it("should update cache file after performing new action", async () => {
      mockPromptHandler.runPrompt.mockResolvedValue("// New action code");

      await pilot.perform("New action");
      pilot.end();

      expect(mockedCacheFile).toEqual({
        '{"step":"New action","previous":[]}': expect.arrayContaining([
          expect.any(Object),
          expect.objectContaining({
            code: "// New action code",
            snapshotHash: expect.any(Object),
            viewHierarchy: expect.any(String),
          }),
        ]),
      });
    });

    it("should handle fs.readFileSync errors", async () => {
      mockCache({}); // Set up an initial mocked file
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Read error");
      });
      mockPromptHandler.runPrompt.mockResolvedValue("// New action code");

      await pilot.perform("Action with read error");

      expect(mockPromptHandler.runPrompt).toHaveBeenCalled();
    });

    it("should handle fs.writeFileSync errors", async () => {
      mockCache(undefined); // No mocked file exists
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Write error");
      });
      mockPromptHandler.runPrompt.mockResolvedValue("// Action code");

      await expect(
        pilot.perform("Action with write error"),
      ).resolves.not.toThrow();
    });
  });

  describe("Feature Support", () => {
    beforeEach(() => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      pilot.start();
    });

    it("should work without snapshot images when not supported", async () => {
      mockPromptHandler.isSnapshotImageSupported.mockReturnValue(false);
      mockPromptHandler.runPrompt.mockResolvedValue(
        "// Perform action without snapshot",
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
      pilot.init({
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

  describe("Pilot Method", () => {
    let mockFrameworkDriver: any;
    let mockPromptHandler: jest.Mocked<PromptHandler>;

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
      };

      Pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      Pilot.getInstance().start();
    });

    afterEach(() => {
      (Pilot as any)["instance"] = undefined;
    });

    it("should perform pilot flow and return a pilot report", async () => {
      const goal = "Complete the login flow";
      const mockPilotReport: AutoReport = {
        summary: "All steps completed successfully",
        goal: goal,
        steps: [
          {
            screenDescription: "Login Screen", // Added screenDescription
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
      const copilotInstance = Pilot.getInstance();
      const spyPilotPerformerPerform = jest
        .spyOn(copilotInstance["autoPerformer"], "perform")
        .mockResolvedValue(mockPilotReport);

      const result = await copilotInstance.autopilot(goal);

      expect(spyPilotPerformerPerform).toHaveBeenCalledTimes(1);
      expect(spyPilotPerformerPerform).toHaveBeenCalledWith(goal);
      expect(result).toEqual(mockPilotReport);
    });

    it("should handle errors from autoPerformer.perform", async () => {
      const goal = "Some goal that causes an error";

      const errorMessage = "Error during pilot execution";
      const copilotInstance = Pilot.getInstance();
      const spyPilotPerformerPerform = jest
        .spyOn(copilotInstance["autoPerformer"], "perform")
        .mockRejectedValue(new Error(errorMessage));

      await expect(copilotInstance.autopilot(goal)).rejects.toThrow(
        errorMessage,
      );

      expect(spyPilotPerformerPerform).toHaveBeenCalledTimes(1);
      expect(spyPilotPerformerPerform).toHaveBeenCalledWith(goal);
    });
  });

  describe("Cache Modes", () => {
    beforeEach(() => {
      mockPromptHandler.runPrompt.mockResolvedValue("// No operation");
    });

    it("should use full cache mode by default", async () => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });
      pilot.start();

      await pilot.perform("Tap on the login button");
      pilot.end();

      const firstCacheValue = Object.values(
        (mockedCacheFile as Record<string, CacheValues>) || {},
      )[0][0];

      expect(firstCacheValue).toHaveProperty("viewHierarchy");
      expect(firstCacheValue).toHaveProperty("code");
      expect(firstCacheValue).toHaveProperty("snapshotHash");
    });

    it("should not include view hierarchy in cache value when using lightweight mode", async () => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
        options: {
          cacheMode: "lightweight",
        },
      });
      pilot.start();

      await pilot.perform("Tap on the login button");
      pilot.end();
      const firstCacheValue = Object.values(
        (mockedCacheFile as Record<string, CacheValues>) || {},
      )[0][0];

      expect(firstCacheValue).not.toHaveProperty("viewHierarchy");
      expect(firstCacheValue).toHaveProperty("code");
    });

    it("should not use cache when cache mode is disabled", async () => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
        options: {
          cacheMode: "disabled",
        },
      });
      pilot.start();

      // First call
      await pilot.perform("Tap on the login button");
      pilot.end();

      // Second call with same intent
      pilot.start();
      await pilot.perform("Tap on the login button");
      pilot.end();

      // Should call runPrompt twice since cache is disabled
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(2);
    });
  });

  describe("Analysis Modes", () => {
    beforeEach(() => {
      mockPromptHandler.runPrompt.mockResolvedValue("// No operation");
    });

    it("should perform fast analysis by default", async () => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
      });

      pilot.start();
      await pilot.perform("Tap on the login button");
      pilot.end();

      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(1);
    });

    it("should perform fast analysis when specified", async () => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
        options: {
          analysisMode: "fast",
        },
      });

      pilot.start();
      await pilot.perform("Tap on the login button");
      pilot.end();

      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(1);
    });

    it("should perform full analysis when specified", async () => {
      pilot.init({
        frameworkDriver: mockFrameworkDriver,
        promptHandler: mockPromptHandler,
        options: {
          analysisMode: "full",
        },
      });

      pilot.start();
      await pilot.perform("Tap on the login button");
      pilot.end();

      // requires several prompts to be run
      expect(mockPromptHandler.runPrompt).toHaveBeenCalledTimes(3);
    });
  });
});
