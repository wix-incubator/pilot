import { Pilot } from "@wix-pilot/core";
import puppeteer from "puppeteer";
import * as puppeteerCore from "puppeteer-core";
import { PromptHandler } from "../utils/promptHandler";
import { PuppeteerFrameworkDriver } from "../index";

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
  });

  it.only("perform test with autopilot", async () => {
    await pilot.autopilot(
      "Open https://www.wix.com/domains and check domain availability for wix-pilot.net with GUI browser",
    );
  });
});
