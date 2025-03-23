import { AutoReviewSectionConfig } from "@/types";

const AUTOPILOT_REVIEW_DEFAULTS: AutoReviewSectionConfig[] = [
  {
    title: "UX",
    description:
      "The UX Review focuses on evaluating the user experience of the product. This review assesses the usability, design consistency, intuitive navigation, and overall user satisfaction.",
    guidelines: [
      "Ensure the product is intuitive and easy to navigate.",
      "Check for visual consistency across different screens or sections.",
      "Evaluate the effectiveness of interactive elements like buttons and forms.",
      "Assess the overall aesthetic appeal and alignment with the target audience's expectations.",
      "Look for any usability issues that may disrupt the user experience.",
    ],
  },
  {
    title: "Accessibility",
    description:
      "The Accessibility Review ensures the product is usable by people with various disabilities. This includes checking compatibility with assistive technologies, color contrast, keyboard navigation, and screen reader support.",
    guidelines: [
      "Verify that all text has sufficient contrast against background colors.",
      "Ensure that interactive elements are keyboard navigable.",
      "Check for the correct use of ARIA (Accessible Rich Internet Applications) roles and labels.",
      "Test screen reader compatibility, ensuring that all content is understandable.",
      "Ensure visual elements have alternative descriptions (e.g., alt text for images).",
    ],
  },
  {
    title: "Internationalization",
    description:
      "The Internationalization Review focuses on the product’s readiness for global markets. This includes evaluating language support, date formats, currency symbols, and overall localization flexibility.",
    guidelines: [
      "Check for support of multiple languages, especially those with different scripts and character sets.",
      "Ensure the product handles different date, time, and currency formats based on the region.",
      "Verify that the UI accommodates text expansion or contraction in different languages.",
      "Ensure content is culturally appropriate and adaptable for various regions.",
      "Look for any hard-coded text that would prevent translation or localization.",
    ],
  },
];

export { AUTOPILOT_REVIEW_DEFAULTS };
