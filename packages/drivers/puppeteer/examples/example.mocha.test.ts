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

  it.skip("perform test with pilot", async function () {
    await pilot.perform(
      "Open https://www.wix.com/domains with GUI browser",
      "Tap on the domain search input",
      "Type wix-pilot.com in the domain search input",
      "Tap on the Search button",
      "The searched domain availability message appears",
      'Click on the "Get it" button',
      "Chose 5 years plan",
      'Press on the "Continue" button',
      "Fill the form with the following details: First Name: John, Last Name: Doe, Email: JohnDoe@gmail.com, Phone: 1234567890, Address: 1234 Wix Ave, City: San Francisco, State: California, Zip: 12345",
      'Press on the "Continue" button',
      'Select "Private Registration" option',
      "Verify the total price is including the domain and the private registration",
      "Continue",
      "Verify you are in the checkout page",
    );
  });

  it.skip("perform test with pilot", async function () {
    await pilot.perform(
      "Open https://www.wix.com/domains with GUI browser",
      "Tap on the domain search input",
      "Type wix-pilot.com in the domain search input",
      "Tap on the Search button",
    );
  });

  it.skip("perform test with autopilot", async function () {
    await pilot.autopilot(
      "Open https://www.wix.com/domains and check domain availability for wix-pilot.net with GUI browser",
    );
  });

  it.skip(
    "auto perform add to cart",
    wrapTest(async function () {
      await pilot.autopilot(
        "Open https://www.yohaiknaani.com, go to `Shop All` page and add `digital varient` to the cart",
      );
    }),
  );

  it.only("open a site", async function () {
    await pilot.perform("Open https://www.yohaiknaani.com");
  });
});
