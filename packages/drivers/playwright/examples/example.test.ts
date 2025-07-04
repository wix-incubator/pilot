import { Pilot } from "@wix-pilot/core";
import { WixPromptHandler } from "@wix-pilot/prompt-handler";
import { PlaywrightFrameworkDriver } from "../index";
import * as playwright from "playwright";

describe("Example Test Suite", () => {
  jest.setTimeout(300000);

  let frameworkDriver: PlaywrightFrameworkDriver;
  let pilot: Pilot;

  beforeAll(async () => {
    const promptHandler: WixPromptHandler = new WixPromptHandler();
    frameworkDriver = new PlaywrightFrameworkDriver();

    pilot = new Pilot({
      frameworkDriver,
      promptHandler,
    });
  });

  afterAll(async () => {
    const page = frameworkDriver.getCurrentPage();
    if (page) {
      await (page as playwright.Page).context().browser()?.close();
    }
  });

  beforeEach(async () => {
    pilot.start();
  });

  afterEach(async () => {
    pilot.end();
  });

  it("perform test with pilot", async () => {
    await pilot.autopilot(
      "Open https://github.com/wix-incubator/pilot and tell me what was the last commit about and who have created it",
    );
  });
});
