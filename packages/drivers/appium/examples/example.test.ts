import { Pilot } from "@wix-pilot/core";
import { WixPromptHandler } from "@wix-pilot/prompt-handler";
import { WebdriverIOAppiumFrameworkDriver } from "../index";

describe("Example Test Suite", () => {
  let frameworkDriver: WebdriverIOAppiumFrameworkDriver;
  let pilot: Pilot;

  before(async () => {
    const promptHandler: WixPromptHandler = new WixPromptHandler();
    frameworkDriver = new WebdriverIOAppiumFrameworkDriver();

    pilot = new Pilot({
      frameworkDriver,
      promptHandler,
    });
  });

  beforeEach(async () => {
    pilot.start();
  });

  afterEach(async () => {
    pilot.end();
  });

  it.skip("perform test with pilot", async () => {
    await pilot.autopilot("earn 2 points in the game");
  });

    it.only('should get 2 point in the first counter', async () => {
        await pilot.autopilot(`Click on the "First Counter" to get to 2 points`);
    });
});
