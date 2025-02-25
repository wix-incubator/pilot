import {
  TestContext,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "./setup";
import { Page as PlaywrightPage } from "playwright";
import WebTestingFrameworkDriverHelper from "../index";

describe("Wix Domains Page Testing", () => {
  let testContext: TestContext;
  let page: PlaywrightPage;
  const driverUtils: WebTestingFrameworkDriverHelper =
    new WebTestingFrameworkDriverHelper();

  beforeAll(async () => {
    testContext = await setupTestEnvironment("wix-domains.html", "playwright");
    page = testContext.page as PlaywrightPage;
  }, 30000);

  afterAll(async () => {
    await teardownTestEnvironment(testContext);
  });

  beforeEach(async () => {
    await driverUtils.removeMarkedElementsHighlights(page);
  });

  it("should match the screenshot against the baseline image", async () => {
    await driverUtils.markImportantElements(page);
    await driverUtils.highlightMarkedElements(page);
    await page.setViewportSize({ width: 800, height: 600 });
    await page.addStyleTag({
      content: `
        * {
          animation: none !important;
          transition: none !important;
          will-change: auto !important;
        }
      `,
    });
    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: "wix-domains-playwright-desktop",
      failureThreshold: 0.1,
      failureThresholdType: "percent",
    });
  });

  it("should generate the expected clean view structure", async () => {
    await driverUtils.markImportantElements(page);
    const structure = await driverUtils.createMarkedViewHierarchy(page);
    expect(structure).toMatchSnapshot("wix-domains-clean-view-structure");
  });
});
