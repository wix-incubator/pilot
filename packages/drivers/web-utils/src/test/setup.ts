import * as puppeteer from "puppeteer";
import {
  chromium,
  Browser as PlaywrightBrowser,
  Page as PlaywrightPage,
  BrowserContext as PlaywrightContext,
} from "playwright";
import type {
  Browser as PuppeteerBrowser,
  Page as PuppeteerPage,
} from "puppeteer";
import { toMatchImageSnapshot } from "jest-image-snapshot";
type FrameworkDriver = "puppeteer" | "playwright";

expect.extend({ toMatchImageSnapshot });

export interface TestContext {
  browser: PuppeteerBrowser | PlaywrightBrowser;
  context?: PlaywrightContext;
  page: PuppeteerPage | PlaywrightPage;
}

export async function setupTestEnvironment(
  htmlFileName: string,
  driver: FrameworkDriver,
): Promise<TestContext> {
  try {
    let browser: PuppeteerBrowser | PlaywrightBrowser;
    let context: PlaywrightContext | undefined;
    let page: PuppeteerPage | PlaywrightPage;

    if (driver === "puppeteer") {
      browser = await puppeteer.launch({
        headless: "new",
        devtools: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      page = await browser.newPage();
    } else if (driver === "playwright") {
      browser = await chromium.launch({
        headless: true,
        devtools: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      context = await browser.newContext();
      page = await context.newPage();
    } else {
      throw new Error(`Unsupported driver: ${driver}`);
    }
    page.on("console", (msg: any) => console.log("Browser log:", msg.text()));
    page.on("pageerror", (err) => console.error("Page error:", err));
    page.setDefaultNavigationTimeout(10000);

    await page.goto(`file://${__dirname}/test-pages/${htmlFileName}`);

    return { browser, context, page };
  } catch (error) {
    console.error("Setup failed:", error);
    throw error;
  }
}

export async function teardownTestEnvironment({
  browser,
  context,
}: TestContext) {
  if (context) {
    await context.close();
  }
  if (browser) {
    await browser.close();
  }
}

beforeAll(() => {
  jest.setTimeout(30000);
});
