import { Pilot } from "@wix-pilot/core";
import puppeteer from "puppeteer";
import * as puppeteerCore from "puppeteer-core";
import { PromptHandler } from "../utils/promptHandler";
import { PuppeteerFrameworkDriver } from "../index";
import { AutoReviewSectionConfig } from "@wix-pilot/core/dist/types";

describe("Example Test Suite", () => {
  jest.setTimeout(300000);

  let frameworkDriver: PuppeteerFrameworkDriver;
  let pilot: Pilot;

  beforeAll(async () => {
    const promptHandler: PromptHandler = new PromptHandler();
    frameworkDriver = new PuppeteerFrameworkDriver(puppeteer.executablePath());

    pilot = new Pilot({
      frameworkDriver,
      promptHandler,
    });
  });

  afterAll(async () => {
    await (frameworkDriver.getCurrentPage() as puppeteerCore.Page)
      ?.browser()
      .close();
  });

  beforeEach(async () => {
    pilot.start();
  });

  afterEach(async () => {
    pilot.end();
  });

  it("test new version", async () => {
    await pilot.autopilot(
        `Open https://qatestrafal.wixsite.com/website-27/post/_demo and inspect **only** the email-subscription form on the page.
    This form has two possible versions: a broken one and a fixed one. Your task is to determine which version is currently displayed.
    Carefully examine the layout of the form. If you notice **any** of the following issues, assume it is the broken version:
    - Overlapping elements
    - Broken floats
    - Misalignment
    - Text that is unreadable, clipped, or poorly contrasted
    If you determine that the displayed version is broken, throw an error to fail the test.
    If the form looks visually correct (none of the issues above are present), do nothing and allow the test to pass.`,
    );
  });

  it("test old version", async () => {
    await pilot.autopilot(
        `Open https://qatestrafal.wixsite.com/polishblogdemo/post/_demo and inspect **only** the email-subscription form on the page.
    This form has two possible versions: a broken one and a fixed one. Your task is to determine which version is currently displayed.
    Carefully examine the layout of the form. If you notice **any** of the following issues, assume it is the broken version:
    - Overlapping elements
    - Broken floats
    - Misalignment
    - Text that is unreadable, clipped, or poorly contrasted
    If you determine that the displayed version is broken, throw an error to fail the test.
    If the form looks visually correct (none of the issues above are present), do nothing and allow the test to pass.`,
    );
  });
});
