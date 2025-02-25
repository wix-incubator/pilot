import { TestingFrameworkAPICatalog, PreviousStep } from "../../types";

export class ViewAnalysisPromptCreator {
  constructor(private apiCatalog: TestingFrameworkAPICatalog) {}

  createPrompt(
    step: string,
    viewHierarchy: string,
    previousSteps: PreviousStep[] = [],
  ): string {
    return [
      "# View Hierarchy Analysis",
      "",
      "## Task Description",
      "",
      `Analyze the view hierarchy to identify the location and context of elements relevant to this task: "${step}"`,
      "",
        ...(previousSteps.length >0 && previousSteps[previousSteps.length - 1].step === step && previousSteps[previousSteps.length - 1].error
            ? ["**Notice:**This error occurred in your previous attempt: " + previousSteps[previousSteps.length - 1].error]
            : []),
      "## View Hierarchy",
      "```",
      viewHierarchy,
      "```",
      "",
      ...(previousSteps.length > 0
        ? [
            "## Previous Steps Context",
            "",
            ...previousSteps
              .map((previousStep, index) => [
                `### Step ${index + 1}`,
                `- Intent: "${previousStep.step}"`,
                `- Result: ${previousStep.result}`,
                ...(index === previousSteps.length - 1 && previousStep.error
                   ? [`- Error: ${previousStep.error}`]
                   : []),
                "",
              ])
              .flat(),
          ]
        : []),
      "## Instructions",
      "",
      "1. Analyze the view hierarchy structure:",
      "   - Identify the target element's location",
      "   - Understand the surrounding layout context",
      "   - Note any parent-child relationships",
      "",
      "2. Evaluate element accessibility:",
      "   - Check if element is likely to be visible",
      "   - Identify potential scroll requirements",
      "   - Note any overlapping elements",
      "",
      "3. Describe the layout context:",
      "   - Parent container type (e.g., list, grid, navigation bar)",
      "   - Relative positioning (e.g., top of screen, within a card)",
      "   - Relationship to other UI elements",
      "",
      "Please provide your response in the following format:",
      "",
      "```",
      "Basic Element Description:",
      "A concise one-line description of what is being targeted (e.g., 'A button in a navigation bar', 'A text input in a form', 'The entire screen', 'A cell in a list')",
      "",
      "Element Location Analysis:",
      "1. Target Element Context",
      "   - Element Type: [The type of UI element being targeted]",
      "   - Container: [The parent container/view type]",
      "   - Position: [Where in the view hierarchy/screen the element is located]",
      "",
      "2. Accessibility Considerations",
      "   - Visibility: [Likely visibility status and any potential issues]",
      "   - Scroll Requirements: [Whether scrolling might be needed]",
      "   - Interaction Constraints: [Any potential barriers to interaction]",
      "",
      "3. Layout Structure",
      "   - Parent Hierarchy: [Description of the view hierarchy path to the element]",
      "   - Sibling Elements: [Related elements that might affect interaction]",
      "   - Screen Region: [General region of the screen where the element is located]",
      "```",
      "",
      "Additional Notes:",
      "- Focus on structural understanding rather than implementation details",
      "- Consider how the element's location affects test reliability",
      "- Note any potential challenges in locating or interacting with the element",
      "",
    ].join("\n");
  }
}
