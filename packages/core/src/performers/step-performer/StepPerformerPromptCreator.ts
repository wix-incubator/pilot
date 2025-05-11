import {
  PreviousStep,
  TestingFrameworkAPICatalog,
  TestingFrameworkAPICatalogCategory,
  TestingFrameworkAPICatalogItem,
} from "@/types";
import { APIFormatter } from "@/common/APIFormatter";
import { truncateString } from "@/common/prompt-utils";

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
      this.createInstructions(intent, isSnapshotImageAttached),
    ]
      .flat()
      .join("\n");
  }

  private createBasePrompt(): string[] {
    const basePrompt = [
      "# Test Code Generation",
      "",
      "You are an AI assistant tasked with generating test code for a specific test step using the mentioned testing framework.",
      "Generate the minimal executable code to perform the desired intent, based on the provided step and context.",
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
      "This is the complete view hierarchy. Use only the relevant parts for the executable code.",
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
        "### Previous steps",
        "",
        ...previousSteps
          .map((previousStep, index) => [
            `#### Step ${index + 1}`,
            `- Intent: "${previousStep.step}"`,
            `- Generated code:`,
            "```",
            previousStep.code,
            "```",
            this.previousStepResultOrError(
              previousStep,
              index === previousSteps.length - 1,
            ),
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
      `Your task is to generate the minimal executable code to perform the following intent: "${intent}". In addition, inside <CACHE_VALIDATION_MATCHER></CACHE_VALIDATION_MATCHER>, add code lines that verify the existence of the elements that will be interacted with in this step. If there is a need to load a page or app before performing the validation, and ONLY if it is the first step, add the suitable code lines inside as well, to avoid "browser is not defined" errors for example. 'waitFor' actions are not needed. Make sure to not add '\n' inside one code action`,
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
      "#### Example of providing the validation matcher for a first step:",
      "<CACHE_VALIDATION_MATCHER>",
      `await puppeteer.launch({ headless: false, executablePath: "/Users/lironsh/.cache/puppeteer/chrome/mac_arm-127.0.6533.88/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", defaultViewport: null, args: ['--start-maximized']}); const page = await browser.newPage(); await page.goto('https://www.wix.com/domains'); setCurrentPage(page);`,
      "</CACHE_VALIDATION_MATCHER>",
        "#### Example of providing the validation matcher",
        "<CACHE_VALIDATION_MATCHER>",
        `const page = getCurrentPage(); const inputElement = await findElement(page, {placeholder: "Type the domain you want","aria-label": "Type the domain you want",class: "KvoMHf has-custom-focus wixui-text-input__input"}) ?? (() => { throw new Error('Input not found'); })(); await inputElement.type('wix-pilot.com');`,
        "</CACHE_VALIDATION_MATCHER>",
    ]
      .concat(
        isSnapshotImageAttached
          ? [
              "#### Visual validation using the snapshot:",
              "```typescript",
              "// Visual assertion passed based on the snapshot image.",
              "```",
              "",
            ]
          : [],
      )
      .concat(["Please provide your code below:"]);
  }

  private createStepByStepInstructions(
    isSnapshotImageAttached: boolean,
  ): string[] {
    const steps = [];
    if (isSnapshotImageAttached) {
      steps.push(
        "Analyze the provided intent, the view hierarchy, and the snapshot image to understand the required action.",
        "When interacting with an element, ensure that you use the correct identifier from the view hierarchy. Do not rely on a screenshot to guess the element's selectors. Add code lines that verify the existence of the elements that will be interacted with in this step inside <CACHE_VALIDATION_MATCHER></CACHE_VALIDATION_MATCHER>. If there is a need to load a page or app before performing the validation, and ONLY if it is the first step, add the suitable code lines inside as well, to avoid \"browser is not defined\" errors for example. Pay attention to the fact that if the current step is not the first step, the setup is not needed, and can break the test. Make sure to not add \'\n\' inside one code action.",
        "Assess the positions of elements within the screen layout. Ensure that tests accurately reflect their intended locations, such as whether an element is centered or positioned relative to others. Tests should fail if the actual locations do not align with the expected configuration.",
        "Determine if the intent can be fully validated visually using the snapshot image.",
        "If the intent can be visually analyzed and passes the visual check, return only comments explaining the successful visual assertion.",
        "If the visual assertion fails, return code that throws an informative error explaining the failure, inside <CODE></CODE> block.",
        "If visual validation is not possible, proceed to generate the minimal executable code required to perform the intent.",
      );
    } else {
      steps.push(
        "Analyze the provided intent and the view hierarchy to understand the required action.",
        "Generate the minimal executable code required to perform the intent using the available API inside <CODE></CODE> block.",
        'Inside <CACHE_VALIDATION_MATCHER></CACHE_VALIDATION_MATCHER>, add the minimal executable code (1-2 lines) that verifies the existence of the elements that will be interacted with in this step, in the code part. . If there is a need to load a page or app before performing the validation, and ONLY if it is the first step, add the suitable code lines inside as well, to avoid \"browser is not defined\" errors for example. \'waitFor\' actions are not needed. Make sure to not add \'\n\' inside one code action',
      );
    }
    steps.push(
      "If you cannot generate the relevant code due to ambiguity or invalid intent, return code that throws an informative error explaining the problem in one sentence.",
      "Each step must be completely independent - do not rely on any variables or assignments from previous steps. Even if a variable was declared or assigned in a previous step, you must redeclare and reassign it in your current step.",
      "Use the provided framework APIs as much as possible - prefer using the documented API methods over creating custom implementations.",
      "If you need to share data between steps, use the 'sharedContext' object. You can access and modify it directly like: sharedContext.myKey = 'myValue'",
      "Wrap the generated code with <CODE></CODE> block, without any additional formatting.",
      "Do not provide any additional code beyond the minimal executable code required to perform the intent.",
    );
    return steps;
  }

  private previousStepResultOrError(
    previousStep: PreviousStep,
    isMostPreviousStep: boolean,
  ): string {
    if (previousStep.result && !previousStep.error)
      return `- Result: ${previousStep.result}`;
    if (isMostPreviousStep && previousStep.error) {
      const truncatedError = truncateString(previousStep.error);
      return `- Error occurred in your previous attempt. Try another approach to perform this step. Error message:\n\`\`\`\n${truncatedError}\n\`\`\``;
    }
    return "";
  }
}
