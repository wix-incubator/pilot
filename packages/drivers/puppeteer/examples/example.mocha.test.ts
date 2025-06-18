import { Pilot } from "@wix-pilot/core";
import puppeteer from "puppeteer";
import * as puppeteerCore from "puppeteer-core";
import { WixPromptHandler } from "@wix-pilot/prompt-handler";
import { PuppeteerFrameworkDriver } from "../index";
import { describe, it, before, after, beforeEach, afterEach } from "mocha";

describe("Example Test Suite", function () {
  this.timeout(300000);

  let frameworkDriver: PuppeteerFrameworkDriver;
  let pilot: Pilot;
  let testFailed = false;

  before(async function () {
    const promptHandler: WixPromptHandler = new WixPromptHandler();
    frameworkDriver = new PuppeteerFrameworkDriver(puppeteer.executablePath());

    pilot = new Pilot({
      frameworkDriver,
      promptHandler,
    });
  });

  after(async function () {
    await (frameworkDriver.getCurrentPage() as puppeteerCore.Page)
      ?.browser()
      .close();
  });

  beforeEach(async function () {
    testFailed = false;
    pilot.start();
  });

  afterEach(async function () {
    pilot.end(!testFailed);
  });

  const wrapTest = (fn: () => Promise<void>) =>
    async function () {
      try {
        await fn();
      } catch (err) {
        testFailed = true;
        throw err;
      }
    };

  it.only("open a site", async function () {
    await pilot.perform("Open https://www.yohaiknaani.com");
  });
});
