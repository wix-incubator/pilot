import type { Page as PuppeteerPage } from "puppeteer";
import {
  TestContext,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "./setup";
import WebTestingFrameworkDriverHelper from "../index";

function areHashesSimilar(
  hash1: string,
  hash2: string,
  threshold: number,
): boolean {
  const num1 = parseInt(hash1, 16);
  const num2 = parseInt(hash2, 16);
  return Math.abs(num1 - num2) <= threshold;
}

describe("Wix Domains Page Testing", () => {
  let testContext: TestContext;
  let page: PuppeteerPage;
  const driverUtils: WebTestingFrameworkDriverHelper =
    new WebTestingFrameworkDriverHelper();

  beforeAll(async () => {
    testContext = await setupTestEnvironment("wix-domains.html", "puppeteer");
    page = testContext.page as PuppeteerPage;
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
    await page.setViewport({ width: 800, height: 600 });
    await page.addStyleTag({
      content: `
        * {
          animation: none !important;
          transition: none !important;
          will-change: auto !important;
        }
      `,
    });
    await page.waitForNetworkIdle({ idleTime: 500 });
    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: "wix-domains-puppeteer-desktop",
      failureThreshold: 0.05,
      failureThresholdType: "percent",
    });
  });

  it("should generate the expected clean view structure", async () => {
    await driverUtils.markImportantElements(page);
    const structure = await driverUtils.createMarkedViewHierarchy(page);
    expect(structure).toMatchSnapshot("wix-domains-clean-view-structure");
  });
  it("should keep the same element hashes (within threshold) after adding minimal padding", async () => {
    await driverUtils.markImportantElements(page);
    const hashesBefore = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[aria-pilot-id]")).map(
        (el) => ({
          hash: el.getAttribute("aria-pilot-id"),
          category: el.getAttribute("aria-pilot-category"),
        }),
      );
    });
    await page.addStyleTag({ content: "body { padding: 100px !important; }" });
    await driverUtils.markImportantElements(page);
    const hashesAfter = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[aria-pilot-id]")).map(
        (el) => ({
          hash: el.getAttribute("aria-pilot-id"),
          category: el.getAttribute("aria-pilot-category"),
        }),
      );
    });
    const THRESHOLD = 10;
    expect(hashesAfter.length).toEqual(hashesBefore.length);
    for (let i = 0; i < hashesBefore.length; i++) {
      const before = hashesBefore[i];
      const after = hashesAfter[i];
      expect(after.category).toEqual(before.category);
      const similar = areHashesSimilar(
        before.hash || "",
        after.hash || "",
        THRESHOLD,
      );
      expect(similar).toBe(true);
    }
  });

  it("should assign a new unique hash for a newly added button element while keeping existing ones (within threshold) unchanged", async () => {
    // Mark elements and capture their unique IDs (hashes)
    await driverUtils.markImportantElements(page);
    const hashesBefore = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[aria-pilot-id]")).map(
        (el) => ({
          hash: el.getAttribute("aria-pilot-id"),
          category: el.getAttribute("aria-pilot-category"),
        }),
      );
    });

    // Add a new button to the DOM (since div is not considered important)
    await page.evaluate(() => {
      for (let i = 1; i < 10; i++) {
        const newButton = document.createElement("button");
        newButton.textContent = `New Test Button ${i}`;
        newButton.style.position = "absolute";
        newButton.style.top = `${50 + i}px`;
        newButton.style.left = `${50 + i}px`;
        document.body.appendChild(newButton);
      }
    });

    await driverUtils.markImportantElements(page);
    const hashesAfter = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[aria-pilot-id]")).map(
        (el) => ({
          hash: el.getAttribute("aria-pilot-id"),
          category: el.getAttribute("aria-pilot-category"),
        }),
      );
    });
    const THRESHOLD = 10;
    for (const oldEl of hashesBefore) {
      const match = hashesAfter.find((newEl) => {
        return areHashesSimilar(oldEl.hash || "", newEl.hash || "", THRESHOLD);
      });
      expect(match).toBeDefined();
    }
    expect(hashesAfter.length).toBe(hashesBefore.length + 9);
  });
});
