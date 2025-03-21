import { AutoPreviousStep, AutoReviewSectionType } from "@/types";
import { truncateString } from "@/common/prompt-utils";

export class AutoPerformerPromptCreator {
  constructor() {}

  createPrompt(
    goal: string,
    viewHierarchy: string,
    isSnapshotImageAttached: boolean,
    previousSteps: AutoPreviousStep[],
  ): string {
    return [
      this.createBasePrompt(),
      this.createContext(
        goal,
        viewHierarchy,
        isSnapshotImageAttached,
        previousSteps,
      ),
      this.createInstructions(goal, isSnapshotImageAttached),
    ]
      .flat()
      .join("\n");
  }

  private createBasePrompt(): string[] {
    return [
      "# Next Step Generation and UX/Accessibility/Internationalization Reporting",
      "",
      "You are an AI assistant tasked with:",
      "",
      `1. Predicting the next optimal action a user should take within an application to progress towards a specific goal or to declare success.`,
      `   Please generate a one-line string that precisely describes the next action the user should take to move closer to their goal,`,
      `   and another string (which can be greater than one line) which describes your thoughts while creating the step.`,
      `   If the goal has been reached, return a one word action 'success'. `,
      `   If it is not possible to determine the next action, and you tried and failed, throw an error.`,
      `   If there are any active loaders, spinners, animations, or partially rendered content in the screen, return "wait 3000" as the action.`,
      "2. Creating comprehensive UX, Accessibility, and Internationalization reports that include a review, findings, and a score.",
      "",
      "Please adhere to the instructions below to provide detailed and helpful responses.",
      "",
    ];
  }

  private createContext(
    goal: string,
    viewHierarchy: string,
    isSnapshotImageAttached: boolean,
    previousSteps: AutoPreviousStep[],
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

            if (previousStep.review) {
              for (const sectionType of Object.keys(
                previousStep.review,
              ) as AutoReviewSectionType[]) {
                const sectionReview = previousStep.review[sectionType];
                if (sectionReview) {
                  stepDetails.push(
                    `- ${this.getSectionName(sectionType)} Review:`,
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

  private getSectionName(sectionType: AutoReviewSectionType): string {
    switch (sectionType) {
      case "ux":
        return "UX";
      case "a11y":
        return "Accessibility";
      case "i18n":
        return "Internationalization";
      default:
        throw new Error(`Invalid review section: ${sectionType}`);
    }
  }

  private createInstructions(
    goal: string,
    isSnapshotImageAttached: boolean,
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
      `3. **Review Reports**: Create comprehensive review reports for each applicable section (e.g., UX, Accessibility, Internationalization) that include a summary, findings, and a score.`,
      "",
      "### Please follow these steps carefully:",
      "",
      ...this.createStepByStepInstructions(isSnapshotImageAttached).map(
        (instruction, index) => `${index + 1}. ${instruction}`,
      ),
      "",
      "### Verify the Prompt",
      "",
      "Before generating your response, please review the provided context and instructions to ensure they are clear and unambiguous.",
      "If you encounter any issues or have questions, please throw an informative error explaining the problem in one sentence.",
      "",
      "### Examples for Answer Formats",
      "",
      "Given goal: 'Add a product to the shopping cart and validate it was added correctly.'",
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

<UX>
<SUMMARY>
The product catalog page has a clean layout but could improve call-to-action visibility.
</SUMMARY>
<FINDINGS>
  - The "Add to Cart" buttons require scrolling for products lower in the grid - Consider sticky shopping actions when scrolling through products.
  - Product cards have inconsistent heights based on description length - Standardize card heights for better visual alignment.
  - The "Add to Cart" text is generic - Use more engaging text like "Add Red Dress to Bag" or "Get This Look" to create urgency.
</FINDINGS>
<SCORE>
7/10
</SCORE>
</UX>
<ACCESSIBILITY>
<SUMMARY>
The product catalog page has several accessibility issues affecting the shopping experience.
</SUMMARY>
<FINDINGS>
  - Product images lack descriptive text for users who can't see images - Add meaningful descriptions of products.
  - The "Add to Cart" buttons have small touch targets - Enlarge clickable areas to help users with motor control difficulties.
  - Text-background contrast on product prices is low - Improve contrast with a darker font or background highlight.
</FINDINGS>
<SCORE>
5/10
</SCORE>
</ACCESSIBILITY>
<INTERNATIONALIZATION>
<SUMMARY>
The product catalog text could be more engaging and region-appropriate.
</SUMMARY>
<FINDINGS>
  - "Add to Cart" is functional but not exciting - Try more engaging phrases like "Get It Now" or "Must Have!" to increase conversion.
  - Price display "$49.99" could be more region-aware - Consider dynamic formatting like "49.99 USD" for clarity.
  - Product descriptions are brief and utilitarian - Add more emotional and culturally relevant descriptions like "Perfect for summer evenings" based on region.
</FINDINGS>
<SCORE>
6/10
</SCORE>
</INTERNATIONALIZATION>`,

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

<UX>
<SUMMARY>
The addition notification provides feedback but misses opportunities to enhance the shopping experience.
</SUMMARY>
<FINDINGS>
  - The notification lacks a product thumbnail - Include a small image of the added product for visual confirmation.
  - The success message "Item Added" is very basic - Consider more enthusiastic messaging like "Great Choice!" or "Added to Your Collection!"
  - The "View Cart" button is understated - Make it more prominent with contrasting colors or an icon.
</FINDINGS>
<SCORE>
6/10
</SCORE>
</UX>
<ACCESSIBILITY>
<SUMMARY>
The notification overlay has usability barriers for users with disabilities.
</SUMMARY>
<FINDINGS>
  - The notification may not be announced properly to screen readers - Ensure the added product name is included in announcements.
  - The auto-dismiss timing is too quick - Provide more time for all users to process the information.
  - "View Cart" button lacks clear visual focus indicators - Add obvious focus states for keyboard users.
</FINDINGS>
<SCORE>
4/10
</SCORE>
</ACCESSIBILITY>
<INTERNATIONALIZATION>
<SUMMARY>
The notification text could be more compelling and culturally relevant.
</SUMMARY>
<FINDINGS>
  - "Item Added" is functional but uninspiring - Try more engaging confirmations like "Perfect Addition!" or "Great Choice!"
  - "View Cart" is direct but lacks urgency - Consider more action-oriented text like "See What's in Your Bag" or "Ready to Checkout?"
  - There's no reinforcement of the good decision - Add affirmative text like "This item is trending!" to validate the user's choice.
</FINDINGS>
<SCORE>
5/10
</SCORE>
</INTERNATIONALIZATION>`,

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
<UX>
<SUMMARY>
The add-to-cart validation flow works functionally but misses opportunities to delight customers.
</SUMMARY>
<FINDINGS>
  - The product catalog makes some "Add to Cart" buttons require scrolling to access.
  - The notification confirms addition but lacks visual excitement and product imagery.
  - The cart page title "Your Cart" is generic - Consider more personalized headings like "Your Selected Items" or "Your Collection".
</FINDINGS>
<SCORE>
7/10 - The flow works but could be more engaging and visually intuitive.
</SCORE>
</UX>
<ACCESSIBILITY>
<SUMMARY>
The add-to-cart validation flow presents several barriers for users with disabilities.
</SUMMARY>
<FINDINGS>
  - Images lack proper text alternatives throughout the flow.
  - Interactive elements have insufficient focus indicators and small touch targets.
  - Text contrast is problematic in multiple areas, especially for prices and status messages.
</FINDINGS>
<SCORE>
4/10 - The flow needs significant accessibility improvements.
</SCORE>
</ACCESSIBILITY>
<INTERNATIONALIZATION>
<SUMMARY>
The add-to-cart flow uses functional text that could be more compelling and culturally relevant.
</SUMMARY>
<FINDINGS>
  - "Your Cart" heading is functional but impersonal - Try more engaging headings like "Your Fashion Selections" or "Items You'll Love".
  - The "Checkout" button uses direct language - Consider more motivating phrases like "Complete Your Look" or "Secure Your Style".
  - There's no urgency messaging - Add culturally relevant prompts like "These Items Are Selling Fast!" to drive conversion.
</FINDINGS>
<SCORE>
6/10 - The text is functional but misses opportunities to create emotional connection.
</SCORE>
</INTERNATIONALIZATION>`,

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
<UX>
<SUMMARY>
The 'Profile' icon (ID: icon_profile) might not be immediately recognized by all users.
</SUMMARY>
<FINDINGS>
  - Uses an uncommon symbol instead of the standard user silhouette - Replace with the standard user silhouette icon.
  - Lacks a text label, which may confuse some users - Add a text label or tooltip that says 'Profile'.
</FINDINGS>
<SCORE>
5/10
</SCORE>
</UX>
<ACCESSIBILITY>
<SUMMARY>
The 'Profile' icon (ID: icon_profile) has accessibility issues that could affect users with disabilities.
</SUMMARY>
<FINDINGS>
  - No 'aria-label' provided for screen readers - Add an 'aria-label' with the text 'User Profile'.
  - The icon is not reachable via keyboard navigation - Ensure the icon can be focused and activated via keyboard.
</FINDINGS>
<SCORE>
4/10
</SCORE>
</ACCESSIBILITY>
<INTERNATIONALIZATION>
<SUMMARY>
The 'Profile' icon may not be properly adapted for different locales.
</SUMMARY>
<FINDINGS>
  - Iconography may not be universally recognized - Consider using culturally neutral icons.
  - No localization for the tooltip text - Ensure tooltips and labels are localized.
  - Date and time formats on the profile screen may not match user locale - Use locale-aware date and time formats.
</FINDINGS>
<SCORE>
6/10
</SCORE>
</INTERNATIONALIZATION>`,

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
      "If the goal is achieved, add a `<SUMMARY>` block inside the `<THOUGHTS>` section, summarizing the overall flow and findings. Also, provide comprehensive overall UX, Accessibility, and Internationalization reviews with total scores, given all the screens seen in previous steps, inside the respective review sections.",
      "For each applicable review section (`UX`, `Accessibility`, `Internationalization`), create a comprehensive report enclosed within corresponding tags (e.g., `<UX>`, `<ACCESSIBILITY>`, `<INTERNATIONALIZATION>`), including a summary, findings, and a score out of 10.",
      "Ensure each section is clearly labeled and formatted as shown in the examples.",
      "If you cannot determine the next action due to ambiguity or missing information, throw an informative error explaining the problem in one sentence.",
    ];
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
}
