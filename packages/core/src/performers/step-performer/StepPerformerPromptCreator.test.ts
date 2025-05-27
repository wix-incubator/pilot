import { StepPerformerPromptCreator } from "@/performers/step-performer/StepPerformerPromptCreator";
import { PreviousStep, TestingFrameworkAPICatalog } from "@/types";
import {
  bazCategory,
  barCategory2,
  promptCreatorConstructorMockAPI,
} from "@/test-utils/APICatalogTestUtils";

const mockAPI: TestingFrameworkAPICatalog = {
  context: {},
  categories: [
    {
      title: "Actions",
      items: [
        {
          signature: "tap(element: Element)",
          description: "Taps on the specified element.",
          example: 'await element(by.id("button")).tap();',
          guidelines: [
            "Ensure the element is tappable before using this method.",
          ],
        },
        {
          signature: "typeText(element: Element, text: string)",
          description: "Types the specified text into the element.",
          example: 'await element(by.id("input")).typeText("Hello, World!");',
          guidelines: ["Use this method only on text input elements."],
        },
      ],
    },
    {
      title: "Assertions",
      items: [
        {
          signature: "toBeVisible()",
          description: "Asserts that the element is visible on the screen.",
          example: 'await expect(element(by.id("title"))).toBeVisible();',
          guidelines: ["Consider scroll position when using this assertion."],
        },
      ],
    },
    {
      title: "Matchers",
      items: [
        {
          signature: "by.id(id: string)",
          description: "Matches elements by their ID attribute.",
          example: 'element(by.id("uniqueId"))',
          guidelines: [
            "Use unique IDs for elements to avoid conflicts, combine with atIndex() if necessary.",
          ],
        },
      ],
    },
  ],
};

describe("PromptCreator constructor", () => {
  it("should merge redundant categories", () => {
    const promptCreator = new StepPerformerPromptCreator(
      promptCreatorConstructorMockAPI,
    );
    const intent = "expect button to be visible";
    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    const promptConstructorCategory = promptCreator.createPrompt(
      intent,
      viewHierarchy,
      false,
      [],
    );

    expect(promptConstructorCategory).toMatchSnapshot();
  });
});

describe("PromptCreator", () => {
  let promptCreator: StepPerformerPromptCreator;

  beforeEach(() => {
    promptCreator = new StepPerformerPromptCreator(mockAPI);
  });

  it("should create a prompt for an intent correctly", () => {
    const intent = "tap button";
    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';
    const prompt = promptCreator.createPrompt(intent, viewHierarchy, true, []);
    expect(prompt).toMatchSnapshot();
  });

  it("should include previous intents in the context", () => {
    const intent = "tap button";
    const previousSteps: PreviousStep[] = [
      {
        step: "navigate to login screen",
        code: 'await element(by.id("login")).tap();',
        result: "success",
      },
      {
        step: "enter username",
        code: 'await element(by.id("username")).typeText("john_doe");',
        result: "john doe",
      },
    ];

    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    const prompt = promptCreator.createPrompt(
      intent,
      viewHierarchy,
      false,
      previousSteps,
    );

    expect(prompt).toMatchSnapshot();
  });

  it("should include error in the prompt if previous step failed", () => {
    const intent = "tap button";
    const previousSteps: PreviousStep[] = [
      {
        step: "navigate to login screen",
        code: 'await element(by.id("login")).tap();',
        result: "success",
      },
      {
        step: "enter username",
        code: 'await element(by.id("username")).typeText("john_doe");',
        error: "could not find element",
      },
    ];
    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    const prompt = promptCreator.createPrompt(
      intent,
      viewHierarchy,
      false,
      previousSteps,
    );

    expect(prompt).toMatchSnapshot();
    expect(prompt).toContain("could not find element");
  });

  it("should not include error if the error was not in the immediate previous step", () => {
    const intent = "tap button";
    const previousSteps: PreviousStep[] = [
      {
        step: "navigate to login screen",
        code: 'await element(by.id("login")).tap();',
        result: "success",
      },
      {
        step: "enter username",
        code: 'await element(by.id("username")).typeText("john_doe");',
        error: "could not find element",
      },
      {
        step: "enter username",
        code: 'await element(by.id("username")).typeText("john_doe");',
        result: "john doe",
      },
    ];

    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    const prompt = promptCreator.createPrompt(
      intent,
      viewHierarchy,
      false,
      previousSteps,
    );

    expect(prompt).toMatchSnapshot();
    expect(prompt).not.toContain("could not find element");
  });

  it("should handle when no snapshot image is attached", () => {
    const intent = "expect button to be visible";
    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    const prompt = promptCreator.createPrompt(intent, viewHierarchy, false, []);

    expect(prompt).toMatchSnapshot();
  });

  describe("CACHE_VALIDATION_MATCHER behavior", () => {
    it("should include CACHE_VALIDATION_MATCHER instructions when snapshot is attached", () => {
      const intent = "tap submit button";
      const viewHierarchy =
        '<View><Button testID="submit" title="Submit" /></View>';

      const prompt = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        true,
        [],
      );

      expect(prompt).toContain("CACHE_VALIDATION_MATCHER");
      expect(prompt).toContain("You must provide TWO separate outputs");
      expect(prompt).toContain(
        "element validation code in <CACHE_VALIDATION_MATCHER></CACHE_VALIDATION_MATCHER> tags",
      );
      expect(prompt).toMatchSnapshot();
    });

    it("should NOT include CACHE_VALIDATION_MATCHER instructions when no snapshot is attached", () => {
      const intent = "tap submit button";
      const viewHierarchy =
        '<View><Button testID="submit" title="Submit" /></View>';

      const prompt = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        false,
        [],
      );

      expect(prompt).not.toContain("CACHE_VALIDATION_MATCHER");
      expect(prompt).not.toContain("You must provide TWO separate outputs");
      expect(prompt).not.toContain(
        "element validation code in <CACHE_VALIDATION_MATCHER></CACHE_VALIDATION_MATCHER> tags",
      );
      expect(prompt).toMatchSnapshot();
    });
  });

  describe("Framework-specific references", () => {
    it("should use specific framework name when available", () => {
      const mockAPIWithName: TestingFrameworkAPICatalog = {
        name: "Playwright",
        description: "End-to-end testing framework",
        context: {},
        categories: mockAPI.categories,
      };

      const promptCreatorWithName = new StepPerformerPromptCreator(
        mockAPIWithName,
      );
      const intent = "click button";
      const viewHierarchy =
        '<View><Button testID="submit" title="Submit" /></View>';

      const prompt = promptCreatorWithName.createPrompt(
        intent,
        viewHierarchy,
        true,
        [],
      );

      expect(prompt).toContain("using Playwright");
      expect(prompt).toContain("Playwright's wait methods");
      expect(prompt).toContain("Playwright's documented wait APIs");
      expect(prompt).toContain("Use the provided Playwright APIs");
      expect(prompt).toContain("Available Playwright API");
      expect(prompt).toMatchSnapshot();
    });

    it("should use generic references when no framework name is provided", () => {
      const intent = "click button";
      const viewHierarchy =
        '<View><Button testID="submit" title="Submit" /></View>';

      const prompt = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        true,
        [],
      );

      expect(prompt).toContain("using the mentioned testing framework");
      expect(prompt).toContain("the testing framework's wait methods");
      expect(prompt).toContain("the testing framework's documented wait APIs");
      expect(prompt).toContain("Use the provided the testing framework APIs");
      expect(prompt).toContain("Available Testing Framework API");
      expect(prompt).toMatchSnapshot();
    });
  });

  describe("Synchronization instructions", () => {
    it("should include synchronization instructions for both scenarios", () => {
      const intent = "tap button";
      const viewHierarchy =
        '<View><Button testID="submit" title="Submit" /></View>';

      // With screenshot
      const promptWithSnapshot = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        true,
        [],
      );
      expect(promptWithSnapshot).toContain(
        "Include appropriate synchronization",
      );
      expect(promptWithSnapshot).toContain(
        "wait methods to ensure elements are present",
      );

      // Without screenshot
      const promptWithoutSnapshot = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        false,
        [],
      );
      expect(promptWithoutSnapshot).toContain(
        "Include appropriate synchronization",
      );
      expect(promptWithoutSnapshot).toContain(
        "wait methods to ensure elements are present",
      );
    });
  });

  describe("extentAPICategories", () => {
    const intent = "expect button to be visible";
    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    it("should extend the API catalog with new category", () => {
      promptCreator.extendAPICategories([bazCategory]);
      const promptNewCategory = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        false,
        [],
      );

      expect(promptNewCategory).toMatchSnapshot();
    });

    it("should extend the API with existing category", () => {
      promptCreator.extendAPICategories([barCategory2]);
      const promptOldCategory = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        false,
        [],
      );

      expect(promptOldCategory).toMatchSnapshot();
    });
  });
});
