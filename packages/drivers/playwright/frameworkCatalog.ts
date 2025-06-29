import type { TestingFrameworkAPICatalog } from "@wix-pilot/core";
import * as playwright from "playwright";
import { expect as playwrightExpect } from "@playwright/test";

export const createAPICatalog: TestingFrameworkAPICatalog = {
  name: "Playwright",
  description:
    "Playwright is a Node library which provides a high-level API to control browsers over the DevTools Protocol.\nYou can assume that playwright and playwrightExpect are already imported.",
  context: {
    playwright,
    expect: playwrightExpect,
  },
  restrictions: [
    "Never use `expect` directly on the `page` object (e.g., `await expect(page).toBeVisible()`). Assertions must be made on `Locator` objects (e.g., `await expect(page.locator('.my-element')).toBeVisible();`). Refer to the 'Locator Assertions' category and the official Playwright documentation for correct usage: https://playwright.dev/docs/api/class-locatorassertions",
  ],
  categories: [
    {
      title: "Browser and Context Setup",
      items: [
        {
          signature:
            "const browser = await playwright.chromium.launch([options])",
          description: "Launches a new browser instance.",
          example: `const browser = await playwright.chromium.launch({ 
    headless: false,
    timeout: 30000  // Default timeout for all operations
  });
  const context = await browser.newContext();
  //IMPORTANT! 
    context.on('page', async page => {
  await page.waitForLoadState();
  await page.bringToFront();
  setCurrentPage(page);
});
  const page = await context.newPage();
  setCurrentPage(page);
  await page.goto('https://www.test.com/');
  await page.waitForLoadState('load');
  `,
          guidelines: [
            "Set longer timeouts (30s or more) to handle slow operations.",
            "Can use chromium, firefox, or webkit browsers.",
            "Remember to call setCurrentPage after creating a page.",
          ],
        },
        {
          signature: "const context = await browser.newContext([options])",
          description:
            "Creates a new browser context (like an incognito window).",
          example: `const context = await browser.newContext({ 
    viewport: { width: 1280, height: 720 },
    navigationTimeout: 30000,  // Navigation specific timeout
    actionTimeout: 15000      // Action specific timeout
  });
  const page = await context.newPage();
  setCurrentPage(page);
  await page.goto('https://www.test.com/');
  await page.waitForLoadState('load');`,
          guidelines: [
            "Each context is isolated with separate cookies/localStorage.",
            "Set specific timeouts for different operation types.",
            "Configure viewport and other browser settings here.",
          ],
        },
      ],
    },
    {
      title: "Locator Assertions",
      items: [
        {
          signature: "await expect(locator).assertionName([args])",
          description:
            "General syntax for locator assertions. 'locator' should be a Playwright Locator object (e.g., page.locator('selector'), page.getByRole('button')).",
          example: `const locator = page.locator('.my-element');
await expect(locator).toBeVisible();
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();`,
          guidelines: [
            "Always use `expect` with a `Locator` (e.g., `page.locator()`, `page.getByText()`, etc.).",
            "Do not use `expect(page).assertionName()`. This will cause errors.",
            "Refer to Playwright documentation for all available assertions and their options.",
          ],
        },
        {
          signature: "await expect(locator).toBeVisible([options])",
          description: "Ensures the Locator points to a visible element.",
          example: `const myElement = page.locator('#myElement');
await expect(myElement).toBeVisible();
await expect(page.getByText('Welcome')).toBeVisible({ timeout: 5000 });`,
          guidelines: [
            "Visible means the element is not hidden and has a non-zero size.",
          ],
        },
        {
          signature: "await expect(locator).toHaveText(expected, [options])",
          description:
            "Ensures the Locator points to an element with the given text. Can be a string, RegExp, or an array.",
          example: `const title = page.locator('.title');
await expect(title).toHaveText('Welcome, User!');
await expect(page.locator('ul > li')).toHaveText(['Item 1', 'Item 2']);`,
          guidelines: [
            "For arrays, the order and number of elements must match.",
            "Use `useInnerText: true` option if needed.",
          ],
        },
        {
          signature: "await expect(locator).toHaveCount(count, [options])",
          description:
            "Ensures the locator resolves to an exact number of DOM nodes.",
          example: `const listItems = page.locator('ul > li');
await expect(listItems).toHaveCount(3);`,
          guidelines: [
            "Useful for verifying lists or collections of elements.",
          ],
        },
        {
          signature: "await expect(locator).toBeEnabled([options])",
          description: "Ensures the Locator points to an enabled element.",
          example: `const submitButton = page.locator('button.submit');
await expect(submitButton).toBeEnabled();`,
          guidelines: [
            "Element is enabled if it does not have 'disabled' attribute and is not 'aria-disabled'.",
          ],
        },
        {
          signature: "await expect(locator).toBeDisabled([options])",
          description: "Ensures the Locator points to a disabled element.",
          example: `const submitButton = page.locator('button.submit');
// Assuming the button becomes disabled after an action
await expect(submitButton).toBeDisabled();`,
          guidelines: [
            "Element is disabled if it has 'disabled' attribute or is 'aria-disabled'.",
          ],
        },
        {
          signature:
            "await expect(locator).toHaveAttribute(name, value, [options])",
          description:
            "Ensures the Locator points to an element with the given attribute and value.",
          example: `const input = page.locator('input[type="text"]');
await expect(input).toHaveAttribute('placeholder', 'Enter your name');`,
          guidelines: ["Value can be a string or RegExp."],
        },
        {
          signature: "await expect(locator).toBeChecked([options])",
          description:
            "Ensures the Locator points to a checked input (checkbox or radio button).",
          example: `const checkbox = page.getByLabel('Subscribe to newsletter');
await expect(checkbox).toBeChecked(); // Asserts it is checked
await expect(checkbox).not.toBeChecked(); // Asserts it is not checked
await expect(checkbox).toBeChecked({ checked: false }); // Also asserts it is not checked`,
          guidelines: [
            "Use `checked: false` option to assert it's not checked, or use `.not`.",
          ],
        },
      ],
    },
  ],
};
