import pilot from "@wix-pilot/core";
import { PromptHandler } from "../utils/promptHandler";
import { PlaywrightFrameworkDriver } from "../index";
describe("Example Test Suite", () => {
  jest.setTimeout(300000);

  let frameworkDriver: PlaywrightFrameworkDriver;

  beforeAll(async () => {
    const promptHandler: PromptHandler = new PromptHandler();
    frameworkDriver = new PlaywrightFrameworkDriver();

    pilot.init({
      frameworkDriver,
      promptHandler,
    });
  });

  afterAll(async () => {
    const page = frameworkDriver.getCurrentPage();
    if (page) {
      await page.context().browser()?.close();
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
