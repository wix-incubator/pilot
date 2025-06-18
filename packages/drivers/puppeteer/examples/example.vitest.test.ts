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

  it.skip("perform test with pilot", async () => {
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
  }, 300000);

  it.skip("perform test with pilot", async () => {
    await pilot.perform(
      "Open https://www.wix.com/domains with GUI browser",
      "Tap on the domain search input",
      "Type wix-pilot.com in the domain search input",
      "Tap on the Search button",
    );
  }, 300000);

  it.skip("perform test with autopilot", async () => {
    await pilot.autopilot(
      "Open https://www.wix.com/domains and check domain availability for wix-pilot.net with GUI browser",
    );
  }, 300000);

  it.only("open a site", async () => {
    await pilot.perform("Open https://www.yohaiknaani.com site");
  }, 300000);
});
