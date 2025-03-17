import { MATCHING_CONFIG } from "@wix-pilot/web-utils";

export const baseDriverCategories = [
  {
    title: "Current page management",
    items: [
      {
        signature: "const page = getCurrentPage()",
        description:
          "Gets the current page instance. Can return `undefined` if no page is set.",
        example: "const page = getCurrentPage();",
      },
      {
        signature: "setCurrentPage(page)",
        description:
          "Sets the current page instance for the driver to interact with (required if setting a new page).",
        example: "setCurrentPage(page);",
      },
    ],
  },
  {
    title: "Matchers",
    items: [
      {
        signature: "findElement(page, matchingCriteria)",
        description:
          "Selects the element that best matches the provided criteria",
        example: `
          const page = getCurrentPage();
          const submitElement = await findElement(page, 
{
"aria-label": "Submit",
// ... all the attributes from here: ${Object.keys(MATCHING_CONFIG).join(",")}
});
await submitElement.click();`,
        guidelines: [
          `Use the attributes from this list: ${Object.keys(MATCHING_CONFIG).join(",")}.`,
          "You must always detect and use all the attributes related to the element from the provided view",
          "Make sure you are only adding attributes of the relevant element and no any other",
        ],
      },
    ],
  },
];
