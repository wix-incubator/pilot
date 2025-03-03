import {
  TestingFrameworkAPICatalog,
  TestingFrameworkDriver,
} from "@wix-pilot/core";
import * as playwright from "playwright";
import { expect as playwrightExpect } from "@playwright/test";
import WebTestingFrameworkDriverHelper from "@wix-pilot/web-utils";

export class PlaywrightFrameworkDriver implements TestingFrameworkDriver {
  private driverUtils: WebTestingFrameworkDriverHelper;
  constructor() {
    this.setCurrentPage = this.setCurrentPage.bind(this);
    this.getCurrentPage = this.getCurrentPage.bind(this);
    this.findElement = this.findElement.bind(this);
    this.driverUtils = new WebTestingFrameworkDriverHelper();
  }

  /**
   * Gets the current page identifier
   */
  getCurrentPage(): playwright.Page | undefined {
    return this.driverUtils.getCurrentPage() as playwright.Page | undefined;
  }

  /**
   * Sets the current page identifier, must be set if the driver needs to interact with a specific page
   */
  setCurrentPage(page: playwright.Page): void {
    this.driverUtils.setCurrentPage(page);
  }

  /**
   * return the closet element given page and element
   */
  async findElement(page: playwright.Page, element: any): Promise<any> {
    return await this.driverUtils.findElement(page, element);
  }

  /**
   * @inheritdoc
   */
  async captureSnapshotImage(): Promise<string | undefined> {
    return await this.driverUtils.captureSnapshotImage();
  }

  /**
   * @inheritdoc
   */
  async captureViewHierarchyString(): Promise<string> {
    return await this.driverUtils.captureViewHierarchyString();
  }

  /**
   * @inheritdoc
   */
  get apiCatalog(): TestingFrameworkAPICatalog {
    return {
      name: "Playwright",
      description:
        "Playwright is a Node library which provides a high-level API to control browsers over the DevTools Protocol.\nYou can assume that playwright and playwrightExpect are already imported.",
      context: {
        getCurrentPage: this.getCurrentPage,
        setCurrentPage: this.setCurrentPage,
        findElement: this.findElement,
        playwright,
        expect: playwrightExpect,
      },
      restrictions: [
        "Never use expect on the page it self for example : await expect(page).toBeVisible()",
      ],
      categories: [
        {
          title: "Page Management",
          items: [
            {
              signature: "getCurrentPage(): playwright.Page | undefined",
              description: "Gets the current active page instance.",
              example: "const page = getCurrentPage();",
              guidelines: [
                "Always check if page exists before operations.",
                "Returns undefined if no page is set.",
                "Use before any page interactions.",
              ],
            },
            {
              signature: "setCurrentPage(page: playwright.Page): void",
              description: "Sets the current active page for interactions.",
              example:
                "const page = await context.newPage(); setCurrentPage(page);",
              guidelines: [
                "Must be called after creating a new page.",
                "Required before any page interactions.",
                "Only one page can be active at a time.",
              ],
            },
          ],
        },
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
await page.waitForLoadState('load')
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
await page.waitForLoadState('load')
`,

              guidelines: [
                "Each context is isolated with separate cookies/localStorage.",
                "Set specific timeouts for different operation types.",
                "Configure viewport and other browser settings here.",
              ],
            },
          ],
        },
        {
          title: "Matchers",
          items: [
            {
              signature: "findElement(page, element)",
              description:
                "Selects the element that best matches the provided criteria based on thresholds and weighted comparisons. " +
                "This utility examines attributes such as 'aria-label', 'aria-role', 'class', 'id', 'name', 'title', 'placeholder', and 'rect' to compute a match score.",
              example: `
              const page = getCurrentPage();
              const closestElement = await findElement(page, 
  {
    "aria-label": "Submit",
    "aria-role": "button",
    class: "submit-button",
    id: "submit123",
    name: "submit",
    title: "Submit",
    placeholder: "Submit",
    rect: { x: 100, y: 200 }
  })
);`,
              guidelines: [
                "Each criterion is optional since not all elements will have all of these attributes.",
                "Only the provided criteria will be used to compute the match score.",
                "The utility returns the element with the lowest cumulative error across the specified criteria.",
                "If an 'aria-label' is provided, the element with the exact match will be returned directly.",
                "Matches are computed using weighted comparisons with configurable thresholds for each attribute.",
              ],
            },
          ],
        },
      ],
    };
  }
}
