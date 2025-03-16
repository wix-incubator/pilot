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
          "Selects the element that best matches the provided criteria based on thresholds and weighted comparisons. " +
          "This utility examines attributes such as 'aria-label', 'aria-role', 'class', 'id', 'name', 'title', 'placeholder', and 'rect' to compute a match score.",
        example: `
        const page = getCurrentPage();
        const submitElement = await findElement(page, 
{
"aria-label": "Submit",
"aria-role": "button",
class: "submit-button",
id: "submit123",
name: "submit",
title: "Submit",
placeholder: "Submit",
rect: { x: 100, y: 200 }
});
await submitElement.click();`,

        guidelines: [
          "Each criterion is optional since not all elements will have all of these attributes.",
          "The utility returns the element with the lowest cumulative error across the specified criteria.",
          "You can use all properties included in the view hierarchy as a part of the cretiria",
        ],
      },
    ],
  },
];
