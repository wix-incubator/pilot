import {
  TestingFrameworkAPICatalog,
  TestingFrameworkDriver,
  TestingFrameworkDriverConfig,
} from "@wix-pilot/core";
import * as puppeteer from "puppeteer-core";
import { BaseWebDriver } from "@wix-pilot/basewebdriver";
export class PuppeteerFrameworkDriver
  extends BaseWebDriver
  implements TestingFrameworkDriver
{
  private executablePath?: string;

  constructor(executablePath?: string) {
    super();
    this.executablePath = executablePath;
  }

  /**
   * Additional driver configuration.
   *
   * @property useSnapshotStabilitySync - Indicates whether the driver should use wait for screen stability.
   */
  get driverConfig(): TestingFrameworkDriverConfig {
    return { useSnapshotStabilitySync: true };
  }

  /**
   * @inheritdoc
   */
  get apiCatalog(): TestingFrameworkAPICatalog {
    return this.createApiCatalog({
      name: "Puppeteer",
      description:
        "Puppeteer is a Node library which provides a high-level API to control Chrome or Chromium over the DevTools Protocol.\nYou can assume that puppeteer is already imported (as `puppeteer`).",
      context: {
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
          ],
        },
      ],
    });
  }
}
