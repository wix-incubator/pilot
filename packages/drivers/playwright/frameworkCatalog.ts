import type { TestingFrameworkAPICatalog } from "@wix-pilot/core";
import * as playwright from "playwright";
import { expect as playwrightExpect } from "@playwright/test";

export const apiCatalog: TestingFrameworkAPICatalog = {
  name: "Playwright",
  description:
    "Playwright is a Node library which provides a high-level API to control browsers over the DevTools Protocol.\nYou can assume that playwright and playwrightExpect are already imported.",
  context: {
    playwright,
    expect: playwrightExpect,
  },
  restrictions: [
    "Never use expect on the page itself, for example: await expect(page).toBeVisible()",
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
  const page = await context.newPage();
  setCurrentPage(page);
  await page.goto('https://www.test.com/');
  await page.waitForLoadState('load');`,
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
  ],
};
