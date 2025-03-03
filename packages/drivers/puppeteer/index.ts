import {
  TestingFrameworkAPICatalog,
  TestingFrameworkDriver,
} from "@wix-pilot/core";
import * as puppeteer from "puppeteer-core";
import WebTestingFrameworkDriverHelper from "@wix-pilot/web-utils";
export class PuppeteerFrameworkDriver implements TestingFrameworkDriver {
  private executablePath?: string;
  private driverUtils: WebTestingFrameworkDriverHelper;

  constructor(executablePath?: string) {
    this.setCurrentPage = this.setCurrentPage.bind(this);
    this.getCurrentPage = this.getCurrentPage.bind(this);
    this.findElement = this.findElement.bind(this);
    this.executablePath = executablePath;
    this.driverUtils = new WebTestingFrameworkDriverHelper();
  }

  /**
   * Gets the current page identifier
   */
  getCurrentPage(): puppeteer.Page | undefined {
    return this.driverUtils.getCurrentPage() as puppeteer.Page | undefined;
  }

  /**
   * Sets the current page identifier, must be set if the driver needs to interact with a specific page
   */
  setCurrentPage(page: puppeteer.Page): void {
    this.driverUtils.setCurrentPage(page);
  }

  /**
   * return the closet element given page and element
   */
  async findElement(page: puppeteer.Page, element: any): Promise<any> {
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
      name: "Puppeteer",
      description:
        "Puppeteer is a Node library which provides a high-level API to control Chrome or Chromium over the DevTools Protocol.\nYou can assume that puppeteer is already imported (as `puppeteer`).",
      context: {
        getCurrentPage: this.getCurrentPage,
        setCurrentPage: this.setCurrentPage,
        findElement: this.findElement,
        puppeteer,
      },
      categories: [
        {
          title: "Browser",
          items: [
            {
              signature: "const browser = await puppeteer.launch([options])",
              description: "Launches a new browser instance.",
              example: `const browser = await puppeteer.launch({\`headless: false\`, executablePath: "${this.executablePath}" });`,
              guidelines: [
                `Executable path is required always, use the path: ${this.executablePath}`,
                "Options can specify `headless`, `slowMo`, `args`, etc.",
                "Prefer passing `headless: false` to `puppeteer.launch() unless mentioned that " +
                  "it is required to run with headless mode.",
                "Use big viewport size (e.g. `viewport: { width: 1920, height: 1080 }`) to avoid " +
                  "issues with responsive design. (e.g. defaultViewport: null, args:['--start-maximized' ])",
              ],
            },
            {
              signature: "await browser.close()",
              description: "Closes the browser instance.",
              example: "await getCurrentPage().browser().close();",
              guidelines: [
                "Allows to close the browser after finishing a test flow.",
                "Useful for cleaning up resources and freeing memory.",
              ],
            },
            {
              signature: "getCurrentPage().setUserAgent(userAgent)",
              description: "Overrides the default user agent string.",
              example: 'getCurrentPage().setUserAgent("UA-TEST");',
              guidelines: [
                "Affects the value of `navigator.userAgent`.",
                "Useful for simulating different browsers or bots.",
              ],
            },
          ],
        },
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
