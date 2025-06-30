import { TestingFrameworkAPICatalog } from "@wix-pilot/core";
import * as puppeteer from "puppeteer-core";

export const createAPICatalog = (
  executablePath: string,
): TestingFrameworkAPICatalog => ({
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
          example: `const browser = await puppeteer.launch({ headless: false, executablePath: "${executablePath}"});

// IMPORTANT!
browser.on('targetcreated', async target => {
  if (target.type() === 'page') {
    const page = await target.page();
    await page.bringToFront(); 
    await page.waitForNavigation({ waitUntil: 'load' }).catch(() => {});
    setCurrentPage(page);
  }
});

const [page] = await browser.pages();
await page.bringToFront();
setCurrentPage(page);
await page.goto('https://www.test.com/');
await page.waitForNavigation({ waitUntil: 'load' });`,
          guidelines: [
            `Executable path is required always, use the path: ${executablePath}`,
            "Options can specify `headless`, `slowMo`, `args`, etc.",
            "Prefer passing `headless: false` to `puppeteer.launch()` unless headless mode is explicitly required.",
            "Use a large viewport size (e.g. `viewport: { width: 1920, height: 1080 }`) to avoid responsive design issues (for example, use `defaultViewport: null` and `args: ['--start-maximized']`).",
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
