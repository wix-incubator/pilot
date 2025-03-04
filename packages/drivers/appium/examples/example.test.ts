import { Pilot } from "@wix-pilot/core";
import { PromptHandler } from "../utils/promptHandler";
import { WebdriverIOAppiumFrameworkDriver } from "../index";

describe("Example Test Suite", () => {
  let frameworkDriver: WebdriverIOAppiumFrameworkDriver;
  let pilot: Pilot;

  before(async () => {
    const promptHandler: PromptHandler = new PromptHandler();
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

  it("perform test with pilot", async () => {
    await pilot.autopilot("earn 2 points in the game");
  });
});
