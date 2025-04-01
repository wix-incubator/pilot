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

  it("perform test with autopilot 1", async () => {
    await pilot.autopilot(
      "Open https://www.wix.com/domains review the main page",
      [
        {
          title: "Accessibility",
          description: "Accessibility review of the web page",
          guidelines: [
            "Focus on negative aspects of the page",
            "Ensure all images have alt text",
            "Check color contrast ratios",
            "Verify keyboard navigation works",
            "Ensure ARIA roles are used correctly",
            "Ensure support for screen readers",
              "Provide clear example based on real analysis for any of the findings",
          ],
        },
        {
          title: "SEO",
          description: "SEO review of the web page",
          guidelines: [
            "Focus on negative aspects of the page",
            "Check for proper use of meta tags",
            "Verify heading structure",
            "Ensure mobile responsiveness",
            "Check for broken links",
            "Ensure fast loading times",
              "Provide clear example based on real analysis for any of the findings",
          ],
        },
        {
          title: "UX",
            description: "UX review of the web page",
            guidelines: [
                "Focus on negative aspects of the page",
                "Check for clear navigation",
                "Ensure consistent design elements",
                "Verify readability of text",
                "Check for intuitive layout",
                "Evaluate how beautiful the page is",
                "Provide clear example based on real analysis for any of the findings",
                ]
        }
      ],
    );
  });
});
