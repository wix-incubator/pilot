import { TestingFrameworkAPICatalog } from "@wix-pilot/core";
import * as puppeteer from "puppeteer-core";

const waitForNewTab = () => new Promise((resolve) => setTimeout(resolve, 2000));

export const createAPICatalog = (
  executablePath: string,
): TestingFrameworkAPICatalog => ({
  name: "Puppeteer",
  description:
    "Puppeteer is a Node library which provides a high-level API to control Chrome or Chromium over the DevTools Protocol.\nYou can assume that puppeteer is already imported (as `puppeteer`).",
  context: {
    puppeteer,
    waitForNewTab,
  },
  categories: [
    {
      title: "Browser",
      items: [
        {
          signature: "const browser = await puppeteer.launch([options])",
          description: "Launches a new browser instance.",
          example: `const browser = await puppeteer.launch({ headless: false, executablePath: "${executablePath}"});

// IMPORTANT!
browser.on('targetcreated', async target => {
  if (target.type() === 'page') {
    const page = await target.page();
    if (page) {
      await page.waitForFunction(() => document.readyState === 'complete', {timeout: 5000}).catch(() => {});
          await page.bringToFront(); 
          setCurrentPage(page);     
     }
  }
});

const [page] = await browser.pages();
await page.bringToFront();
setCurrentPage(page);
await page.goto('https://www.test.com/', {waitUntil: 'load' });
await this.waitForStableDOM(page);`,
          guidelines: [
            `Executable path is required always, use the path: ${executablePath}`,
            "Options can specify `headless`, `slowMo`, `args`, etc.",
            "Prefer passing `headless: false` to `puppeteer.launch()` unless headless mode is explicitly required.",
            "Use a large viewport size (e.g. `viewport: { width: 1920, height: 1080 }`) to avoid responsive design issues (for example, use `defaultViewport: null` and `args: ['--start-maximized']`).",
            "After clicking any link that opens in a new tab (target='_blank'), always call `await waitForNewTab()` and NOT `await page.waitForNavigation()` to ensure the new tab becomes active before proceeding.",
          ],
        },
        {
          signature: "await browser.close()",
          description: "Closes the browser instance.",
          example: "await getCurrentPage().browser().close();",
          guidelines: [
            "Closes the browser after finishing a test flow.",
            "Useful for cleaning up resources and freeing memory.",
          ],
        },
      ],
    },
  ],
});
