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

  it("should handle when no snapshot image is attached", () => {
    const intent = "expect button to be visible";
    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    const prompt = promptCreator.createPrompt(intent, viewHierarchy, false, []);

    expect(prompt).toMatchSnapshot();
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
