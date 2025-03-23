import { AutoPreviousStep, AutoReviewSectionConfig } from "@/types";
import { truncateString } from "@/common/prompt-utils";
import { breakReviewArrayToItsTypes } from "@/performers/auto-performer/reviews/reviews-utils";

export class AutoPerformerPromptCreator {
  constructor() {}

  createPrompt(
    goal: string,
    viewHierarchy: string,
    isSnapshotImageAttached: boolean,
    previousSteps: AutoPreviousStep[],
    reviewTypes?: AutoReviewSectionConfig[],
  ): string {
    const reviewTypesArray = reviewTypes
      ? breakReviewArrayToItsTypes(reviewTypes)
      : [];
    if (reviewTypesArray.length === 0) {
      return [
        this.createBasePrompt(),
        this.createContext(
          goal,
          viewHierarchy,
          isSnapshotImageAttached,
          previousSteps,
        ),
        this.createInstructions(goal, isSnapshotImageAttached, undefined),
      ]
        .flat()
        .join("\n");
    } else {
      return [
        this.createBasePrompt(reviewTypesArray),
        this.createContext(
          goal,
          viewHierarchy,
          isSnapshotImageAttached,
          previousSteps,
          reviewTypes,
        ),
        this.createInstructions(
          goal,
          isSnapshotImageAttached,
          reviewTypesArray,
        ),
      ]
        .flat()
        .join("\n");
    }
  }

  private createBasePrompt(reviewTypesArray?: string[]): string[] {
    const prompt = [
      "# Next Step Generation Reporting",
      "",
      "You are an AI assistant tasked with:",
      "",
      `1. Predicting the next optimal action a user should take within an application to progress towards a specific goal or to declare success.`,
      `   Please generate a one-line string that precisely describes the next action the user should take to move closer to their goal,`,
      `   and another string (which can be greater than one line) which describes your thoughts while creating the step.`,
      `   If the goal has been reached, return a one word action 'success'. `,
      `   If it is not possible to determine the next action, and you tried and failed, throw an error.`,
      `   If there are any active loaders, spinners, animations, or partially rendered content in the screen, return "wait 3000" as the action.`,
    ];

    if (reviewTypesArray && reviewTypesArray.length > 0) {
      const reviewTypes = reviewTypesArray.join(", ");
      prompt[0] = `# Next Step Generation and ${reviewTypes} Reporting`;
      prompt.push(
        "",
        `2. Creating comprehensive ${reviewTypes} reports that include a review, findings, and a score.`,
      );
    }

    prompt.push(
      "",
      "Please adhere to the instructions below to provide detailed and helpful responses.",
      "",
    );

    return prompt;
  }

  private createContext(
    goal: string,
    viewHierarchy: string,
    isSnapshotImageAttached: boolean,
    previousSteps: AutoPreviousStep[],
    reviewTypes?: AutoReviewSectionConfig[],
  ): string[] {
    const context = [
      "## Context",
      "",
      `### Goal: "${goal}"`,
      "",
      "### View Hierarchy",
      "",
      "```",
      `${viewHierarchy}`,
      "```",
      "",
    ];

    if (isSnapshotImageAttached) {
      context.push(
        "### Snapshot Image",
        "",
        "A snapshot image is attached for visual reference.",
        "",
      );
    } else {
      context.push(
        "### Snapshot Image",
        "",
        "No snapshot image is attached for this intent.",
        "",
      );
    }

    if (previousSteps.length > 0) {
      context.push(
        "### Previous Steps",
        "",
        ...previousSteps
          .map((previousStep, index) => {
            const stepDetails = [
              `#### Step ${index + 1}`,
              `- Screen Name : "${previousStep.screenDescription}"`,
              `- Intent: "${previousStep.step}"`,
            ];

            if (previousStep.review && reviewTypes) {
              for (const sectionType of reviewTypes) {
                const sectionReview = previousStep.review[sectionType.title];
                if (sectionReview) {
                  stepDetails.push(
                    `- ${sectionType.title} Review:`,
                    `  - Summary: ${sectionReview.summary}`,
                  );
                  if (sectionReview.findings?.length) {
                    stepDetails.push(
                      `  - Findings:`,
                      ...sectionReview.findings.map(
                        (finding) => `    - ${finding}`,
                      ),
                    );
                  }
                  stepDetails.push(`  - Score: ${sectionReview.score}`);
                }
              }
            }
            const error = this.isPreviousStepError(
              previousStep,
              index === previousSteps.length - 1,
            );
            !!error && stepDetails.push(error);

            stepDetails.push("");

            return stepDetails;
          })
          .flat(),
        "",
      );
    }

    return context;
  }

  private createInstructions(
    goal: string,
    isSnapshotImageAttached: boolean,
    reviewTypesArray: string[] | undefined,
  ): string[] {
    return [
      "## Instructions",
      "",
      `Your tasks are as follows:`,
      "",
      `1. **Next Action Prediction**: Generate a one-line string that precisely describes the next action the user should take to move closer to their goal: "${goal}"`,
      "",
      `2. **Thought Process**: Provide a detailed description (which can be more than one line) of your thought process while determining the next action.`,
      "",
      reviewTypesArray
        ? `3. **Review Reports**: Create comprehensive review reports for each applicable section (e.g., ${reviewTypesArray.join(", ")}) that include a summary, findings, and a score.`
        : "",
      "",
      "### Please follow these steps carefully:",
      "",
      ...this.createStepByStepInstructions(
        isSnapshotImageAttached,
        reviewTypesArray,
      ).map((instruction, index) => `${index + 1}. ${instruction}`),
      "",
      "### Verify the Prompt",
      "",
      "Before generating your response, please review the provided context and instructions to ensure they are clear and unambiguous.",
      "If you encounter any issues or have questions, please throw an informative error explaining the problem in one sentence.",
      "",
      "### Examples for Answer Formats",
      "",
      `Given goal: 'Add a product to the shopping cart and validate it was added correctly.' The review must contain ${reviewTypesArray?.join(", ")} open and close tags.`,
      "",
      "#### Next Action with Thoughts:",
      "",
      `<SCREENDESCRIPTION>
Products Catalog Page
</SCREENDESCRIPTION>
<THOUGHTS>
I need to add a product to the shopping cart. The page displays multiple products in a grid layout, each with an image, name, price, and an "Add to Cart" button. The red dress in the second position looks like a good option to add to the cart.
</THOUGHTS>
<ACTION>
Tap on the 'Add to Cart' button beneath the red dress product
</ACTION>

${reviewTypesArray ? this.generateReviewSections(reviewTypesArray) : ""}`,

      "",
      "#### Intermediate Step - Cart Notification:",
      "",
      `<SCREENDESCRIPTION>
Product Added Notification Overlay
</SCREENDESCRIPTION>
<THOUGHTS>
A notification has appeared at the top of the screen confirming the red dress was added. Now I need to check the cart to verify the product was added correctly. There's a "View Cart" button in the notification and a cart icon in the header.
</THOUGHTS>
<ACTION>
Tap on the "View Cart" button in the notification
</ACTION>

   ${reviewTypesArray ? this.generateReviewSections(reviewTypesArray) : ""}`,

      "",
      "#### Example of Success - Validation Complete:",
      "",
      `<SCREENDESCRIPTION>
Shopping Cart Page
</SCREENDESCRIPTION>
<THOUGHTS>
I can now see the shopping cart page with the red dress that was added. The product appears with its image, name "Red Cocktail Dress", price "$49.99", and quantity set to 1. The cart subtotal shows "$49.99" which matches the product price. This confirms the product was successfully added to the cart with the correct details.
<SUMMARY>
The goal has been successfully achieved. I added the red dress to the shopping cart and verified it appears correctly with the right details. The flow provided clear feedback at each step, though there were opportunities to improve the messaging and layout.
</SUMMARY>
</THOUGHTS>
<ACTION>
success
</ACTION>

${reviewTypesArray ? this.generateReviewSections(reviewTypesArray) : ""}`,

      "",
      "#### Additional Example:",
      "",
      `<SCREENDESCRIPTION>
User Profile Screen.
</SCREENDESCRIPTION>
<THOUGHTS>
To view the user profile, selecting the 'Profile' icon (ID: icon_profile) is required.
</THOUGHTS>
<ACTION>
Select the 'Profile' icon (ID: icon_profile)
</ACTION>

${reviewTypesArray ? this.generateReviewSections(reviewTypesArray) : ""}`,

      "",
      "#### Example of Throwing an Informative Error:",
      "",
      "```",
      "Error: Unable to determine the next action due to insufficient information in the view hierarchy.",
      "```",
      "",
      "Please provide your response below:",
    ];
  }

  private createStepByStepInstructions(
    isSnapshotImageAttached: boolean,
    reviewTypesArray: string[] | undefined,
  ): string[] {
    const steps = [
      "Analyze the provided goal, view hierarchy, and previous steps to understand the user's progress and available actions.",
      "Check if there are any active loaders, spinners, animations, or partially rendered content in the view hierarchy - if so, the next action should be to wait for 3 seconds ('wait 3000').",
      `Consider the elements present in the view hierarchy${isSnapshotImageAttached ? " and the snapshot image" : ""} to determine possible next actions.`,
      "Determine the optimal next action the user should take to move closer to their goal.",
      "Always describe the next action using plain, natural language rather than technical terms. Avoid using elements like coordinates or test IDs.",
      "Ensure the action is directly related to available elements in the view hierarchy.",
      "Make sure to create a unique screen name enclosed with <SCREENDESCRIPTION> blocks according to the snapshot and view.",
      "Generate a one-line string that precisely describes this next action, enclosed within `<ACTION>` tags.",
      "Provide a detailed description of your thought process enclosed within `<THOUGHTS>` tags.",
      "If the goal is achieved, add a `<SUMMARY>` block inside the `<THOUGHTS>` section, summarizing the overall flow and findings.",
    ];
    if (reviewTypesArray) {
      const reviewTypes = reviewTypesArray.join(", ");
      steps.push(
        `Also, provide comprehensive overall ${reviewTypes} reviews with total scores, given all the screens seen in previous steps, inside the respective review sections.`,
        `For each applicable review section (${reviewTypes}), create a comprehensive report enclosed within corresponding tags (e.g., <UX>, <ACCESSIBILITY>, <INTERNATIONALIZATION>), including a summary, findings, and a score out of 10.`,
        "Ensure each section is clearly labeled and formatted as shown in the examples.",
        "If you cannot determine the next action due to ambiguity or missing information, throw an informative error explaining the problem in one sentence.",
      );
    }

    return steps;
  }

  private isPreviousStepError(
    previousStep: AutoPreviousStep,
    isMostPreviousStep: boolean,
  ): string | undefined {
    if (previousStep.error && isMostPreviousStep) {
      const truncatedError = truncateString(previousStep.error);
      return `- Error occurred in your previous attempt. Try another approach to perform this step. Error message:\n\`\`\`\n${truncatedError}\n\`\`\``;
    }
    return undefined;
  }

  private generateReviewSections(reviewTypesArray: string[]): string {
    return reviewTypesArray
      .map(
        (reviewType) => `<${reviewType.toUpperCase()}>
<SUMMARY>
The product catalog page has some ${reviewType.toLowerCase()} considerations.
</SUMMARY>
<FINDINGS>
  - The product catalog makes some "Add to Cart" buttons require scrolling to access.
  - The notification confirms addition but lacks visual excitement and product imagery.
  - Text-background contrast on product prices is low - Improve contrast with a darker font or background highlight.
</FINDINGS>
<SCORE>
4/10 - The flow needs significant ${reviewType.toLowerCase()} improvements.
</SCORE>
</${reviewType.toUpperCase()}>`,
      )
      .join("\n\n");
  }
}
