import { Pilot } from "@wix-pilot/core";
import puppeteer from "puppeteer";
import * as puppeteerCore from "puppeteer-core";
import { WixPromptHandler } from "@wix-pilot/prompt-handler";
import { PuppeteerFrameworkDriver } from "../index";
import {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";

describe("Example Test Suite", () => {
  let frameworkDriver: PuppeteerFrameworkDriver;
  let pilot: Pilot;
  let testFailed = false;

  beforeAll(async () => {
    const promptHandler: WixPromptHandler = new WixPromptHandler();
    frameworkDriver = new PuppeteerFrameworkDriver(puppeteer.executablePath());

    pilot = new Pilot({
      frameworkDriver,
      promptHandler,
    });
  }, 300000);

  afterAll(async () => {
    await (frameworkDriver.getCurrentPage() as puppeteerCore.Page)
      ?.browser()
      .close();
  });

  beforeEach(async () => {
    testFailed = false;
    pilot.start();
  });

  afterEach(async () => {
    pilot.end(!testFailed);
  });

  it.only("open a site", async () => {
    await pilot.perform("Open https://www.yohaiknaani.com site");
  }, 300000);
});
