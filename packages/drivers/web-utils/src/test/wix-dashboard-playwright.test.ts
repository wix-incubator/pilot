import {
  TestContext,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "./setup";
import { Page as PlaywrightPage } from "playwright";
import WebTestingFrameworkDriverHelper from "../index";

describe("Wix Dashboard Page Testing", () => {
  let testContext: TestContext;
  let page: PlaywrightPage;
  const driverUtils: WebTestingFrameworkDriverHelper =
    new WebTestingFrameworkDriverHelper();

  beforeAll(async () => {
    testContext = await setupTestEnvironment(
      "wix-dashboard.html",
      "playwright",
    );
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
    await page.setViewportSize({ width: 1200, height: 600 });
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
      customSnapshotIdentifier: "wix-dashboard-playwright-desktop",
      failureThreshold: 0.1,
      failureThresholdType: "percent",
    });
  });

  it("should generate the expected clean view structure", async () => {
    await driverUtils.markImportantElements(page);
    const structure = await driverUtils.createMarkedViewHierarchy(page);
    expect(structure).toMatchSnapshot("wix-dashboard-clean-view-structure");
  });
});
