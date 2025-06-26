import { Pilot } from "@wix-pilot/core";
import puppeteer from "puppeteer";
import * as puppeteerCore from "puppeteer-core";
import { WixPromptHandler } from "@wix-pilot/prompt-handler";
import { PuppeteerFrameworkDriver } from "../index";

describe("Example Test Suite", () => {
  jest.setTimeout(300000);

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
  });

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

  const wrapTest = (fn: () => Promise<void>) => async () => {
    try {
      await fn();
    } catch (err) {
      testFailed = true;
      throw err;
    }
  };

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

  it.skip("perform test with pilot", async () => {
    await pilot.perform(
      "Open https://www.wix.com/domains with GUI browser",
      "Tap on the domain search input",
      "Type wix-pilot.com in the domain search input",
      "Tap on the Search button",
    );
  });

  it.skip("perform test with autopilot", async () => {
    await pilot.autopilot(
      "Open https://www.wix.com/domains and check domain availability for wix-pilot.net with GUI browser",
    );
  });

  it.skip("perform test with autopilot", async () => {
    await pilot.autopilot(
      "Open https://www.yohaiknaani.com, search for 'MMO Game', add the first item to the cart, and proceed to checkout.",
    );
  });

  it.skip("perform on yohai's sites", async () => {
    await pilot.perform(
      "Open https://www.yohaiknaani.com",
      "Search for 'MMO Game'",
      "Add the first item to the cart",
      "Proceed to checkout",
    );
  });

  it.skip("perform filter by price", async () => {
    await pilot.perform(
      "Open https://www.yohaiknaani.com",
      "Go to `Shop All` page",
      "Filter price to be 61 to 100 dollars",
      "Add the first item to the cart",
      "Proceed to checkout",
    );
  });

  it.skip(
    "auto perform filter by color - FAILS",
    wrapTest(async () => {
      await pilot.autopilot(
        "Open https://www.yohaiknaani.com, go to `Shop All` page and add `digital varient` to the cart",
      );
    }),
  );

  it.skip("filter by color", async () => {
    await pilot.perform(
      "Open https://www.yohaiknaani.com",
      "Go to `Shop All` page.",
      "Open the color filter",
      "Set color to black",
      "Add the first item to the cart",
    );
  });

  it.skip("perform send a message", async () => {
    await pilot.perform(
      "Open https://www.yohaiknaani.com",
      "Go to `Contact` page.",
      "Tap on the `First Name` input",
      "Type John in the `First Name` input",
      "Tap on the `Last Name` input",
      "Type Doe in the `Last Name` input",
      "Tap on the `Email` input",
      "Type 0Q2Jc@example.com in the `Email` input",
      "Tap on the `Message` input",
      "Type Hello in the `Message` input",
      "Tap on the `Submit` button",
    );
  });

  it.only("open new tab", async () => {
      await pilot.perform(
          "Open https://www.bgu.ac.il/",
          "Click `לפורטל האישי`",
          "Type `lironmir` in the username input"
      );
  });
});
