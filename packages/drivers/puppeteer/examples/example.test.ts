import pilot from "@wix-pilot/core";
import puppeteer from "puppeteer";
import { PromptHandler } from "../utils/promptHandler";
import { PuppeteerFrameworkDriver } from "../index";

describe("Example Test Suite", () => {
  jest.setTimeout(300000);

  let frameworkDriver: PuppeteerFrameworkDriver;

  beforeAll(async () => {
    const promptHandler: PromptHandler = new PromptHandler();
    frameworkDriver = new PuppeteerFrameworkDriver(puppeteer.executablePath());

    pilot.init({
      frameworkDriver,
      promptHandler,
    });
  });

  afterAll(async () => {
    frameworkDriver.getCurrentPage()?.browser().close();
  });

  beforeEach(async () => {
    pilot.start();
  });

  afterEach(async () => {
    pilot.end();
  });

  it("perform test with pilot", async () => {
    await pilot.autopilot(
      "Open https://github.com/wix-incubator/pilot and click on the 'Code' tab, open with GUI browser",
    );
  });
});
