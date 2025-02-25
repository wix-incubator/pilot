import {
  PreviousStep,
  TestingFrameworkAPICatalog,
  TestingFrameworkAPICatalogCategory,
  TestingFrameworkAPICatalogItem,
} from "@/types";
import { APIFormatter } from "@/common/APIFormatter";

export class StepPerformerPromptCreator {
  private apiFormatter: APIFormatter;

  constructor(public readonly apiCatalog: TestingFrameworkAPICatalog) {
    this.apiCatalog.categories = this.mergeCategories(
      this.apiCatalog.categories,
    );
    this.apiFormatter = new APIFormatter(this.apiCatalog);
  }

  extendAPICategories(
    newCategories: TestingFrameworkAPICatalogCategory[],
  ): void {
    this.apiCatalog.categories = this.mergeCategories([
      ...this.apiCatalog.categories,
      ...newCategories,
    ]);
  }

  private mergeCategories(
    categories: TestingFrameworkAPICatalogCategory[],
  ): TestingFrameworkAPICatalogCategory[] {
    return categories.reduce((mergedCategories, category) => {
      const existingIndex = mergedCategories.findIndex(
        (c) => c.title === category.title,
      );

      const uniqueItems = (items: TestingFrameworkAPICatalogItem[]) =>
        Array.from(new Set(items));

      if (existingIndex >= 0) {
        mergedCategories[existingIndex].items = uniqueItems([
          ...mergedCategories[existingIndex].items,
          ...category.items,
        ]);
        return mergedCategories;
      } else {
        category.items = uniqueItems(category.items);
      }

      return [...mergedCategories, { ...category }];
    }, [] as TestingFrameworkAPICatalogCategory[]);
  }

  createPrompt(
    intent: string,
    viewHierarchy: string,
    isSnapshotImageAttached: boolean,
    previousSteps: PreviousStep[],
    apiSearchResults?: string,
  ): string {
    return [
      this.createBasePrompt(),
      this.createContext(
        intent,
        viewHierarchy,
        isSnapshotImageAttached,
        previousSteps,
      ),
      this.createAPIInfo(),
      ...(apiSearchResults
        ? ["## Semantic Matches from API Search", "", apiSearchResults, ""]
        : []),
      this.createInstructions(intent, isSnapshotImageAttached),
    ]
      .flat()
      .join("\n");
  }

  private createBasePrompt(): string[] {
    const basePrompt = [
      "# Test Code Generation",
      "",
      "You are an AI assistant tasked with generating test code for an application using the provided UI testing framework API.",
      "Please generate the minimal executable code to perform the desired intent based on the given information and context.",
      "",
    ];

    if (this.apiCatalog.name || this.apiCatalog.description) {
      basePrompt.push("## Testing Framework");
      basePrompt.push("");

      if (this.apiCatalog.name) {
        basePrompt.push(`Framework: ${this.apiCatalog.name}`);
        basePrompt.push("");
      }

      if (this.apiCatalog.description) {
        basePrompt.push(`Description: ${this.apiCatalog.description}`);
        basePrompt.push("");
      }
    }

    return basePrompt;
  }

  private createContext(
    intent: string,
    viewHierarchy: string,
    isSnapshotImageAttached: boolean,
    previousSteps: PreviousStep[],
  ): string[] {
    const context = [
      "## Context",
      "",
      "### Intent to perform",
      "",
      `Generate the minimal executable code to perform the following intent: "${intent}"`,
      "",
      "### View hierarchy",
      "",
      "```",
      `${viewHierarchy}`,
      "```",
      "",
    ];

    if (isSnapshotImageAttached) {
      context.push(
        "### Snapshot image",
        "",
        "A snapshot image is attached for visual reference.",
        "",
      );
    } else {
      context.push(
        "### Snapshot image",
        "",
        "No snapshot image is attached for this intent.",
        "",
      );
    }

    if (previousSteps.length > 0) {
      context.push(
        "### Previous intents",
        "",
        ...previousSteps
          .map((previousStep, index) => [
            `#### Step ${index + 1}`,
            `- Intent: "${previousStep.step}"`,
            `- Generated code:`,
            "```",
            previousStep.code,
            "```",
            ...(previousStep.result
              ? [`- Result: ${previousStep.result}`]
              : []),
            "",
          ])
          .flat(),
        "",
      );
    }

    return context;
  }

  private createAPIInfo(): string[] {
    return [
      "## Available Testing Framework API",
      "",
      this.apiFormatter.formatAPIInfo(),
    ];
  }

  private createInstructions(
    intent: string,
    isSnapshotImageAttached: boolean,
  ): string[] {
    return [
      "## Instructions",
      "",
      `Your task is to generate the minimal executable code to perform the following intent: "${intent}"`,
      "",
      "Please follow these steps carefully:",
      "",
      ...this.createStepByStepInstructions(isSnapshotImageAttached).map(
        (instruction, index) => `${index + 1}. ${instruction}`,
      ),
      "",
      "### Verify the prompt",
      "",
      "Before generating the code, please review the provided context and instructions to ensure they are clear and unambiguous. If you encounter any issues or have questions, please throw an informative error explaining the problem.",
      "",
      "### Examples",
      "",
      "#### Example of throwing an informative error:",
      "```typescript",
      "throw new Error(\"Unable to find the 'Submit' button element in the current context.\");",
      "```",
      "",
      "#### Example of using shared context between steps:",
      "```typescript",
      "// Step 1: Store the user ID",
      "const userId = await getUserId();",
      "sharedContext.userId = userId;",
      "",
      "// Step 2: Use the stored user ID",
      "await element(by.id('user-' + sharedContext.userId)).tap();",
      "```",
      "",
    ]
      .concat(
        isSnapshotImageAttached
          ? [
              "#### Example of returning a commented visual test if the visual assertion passes:",
              "```typescript",
              "// Visual assertion passed based on the snapshot image.",
              "```",
              "",
            ]
          : [],
      )
      .concat(["Please provide your response below:"]);
  }

  private createStepByStepInstructions(
    isSnapshotImageAttached: boolean,
  ): string[] {
    const steps = [];
    if (isSnapshotImageAttached) {
      steps.push(
        "Analyze the provided intent, the view hierarchy, and the snapshot image to understand the required action.",
        "When interacting with an element, ensure that you use the correct identifier from the view hierarchy. Do not rely on a screenshot to guess the element's selectors.",
        "Assess the positions of elements within the screen layout. Ensure that tests accurately reflect their intended locations, such as whether an element is centered or positioned relative to others. Tests should fail if the actual locations do not align with the expected configuration.",
        "Determine if the intent can be fully validated visually using the snapshot image.",
        "If the intent can be visually analyzed and passes the visual check, return only comments explaining the successful visual assertion.",
        "If the visual assertion fails, return code that throws an informative error explaining the failure.",
        "If visual validation is not possible, proceed to generate the minimal executable code required to perform the intent.",
      );
    } else {
      steps.push(
        "Analyze the provided intent and the view hierarchy to understand the required action.",
        "Generate the minimal executable code required to perform the intent using the available API.",
      );
    }
    steps.push(
      "If you cannot generate the relevant code due to ambiguity or invalid intent, return code that throws an informative error explaining the problem in one sentence.",
      "Each step must be completely independent - do not rely on any variables or assignments from previous steps. Even if a variable was declared or assigned in a previous step, you must redeclare and reassign it in your current step.",
      "Use the provided framework APIs as much as possible - prefer using the documented API methods over creating custom implementations.",
      "If you need to share data between steps, use the 'sharedContext' object. You can access and modify it directly like: sharedContext.myKey = 'myValue'",
      "Wrap the generated code with backticks, without any additional formatting.",
      "Do not provide any additional code beyond the minimal executable code required to perform the intent.",
    );
    return steps;
  }
}
