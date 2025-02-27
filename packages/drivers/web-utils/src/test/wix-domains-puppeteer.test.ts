import type { Page as PuppeteerPage } from "puppeteer";
import {
  TestContext,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "./setup";
import WebTestingFrameworkDriverHelper from "../index";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return (hash >>> 0).toString(16);
}

export function simHash(text: string, hashBits: number = 32): string {
  const tokens = text.split(/\s+/).filter((token) => token.length > 0);
  const bitVector = new Array(hashBits).fill(0);
  tokens.forEach((token) => {
    const tokenHashHex = simpleHash(token);
    const tokenHashNum = parseInt(tokenHashHex, 16);

    for (let i = 0; i < hashBits; i++) {
      if (tokenHashNum & (1 << i)) {
        bitVector[i] += 1;
      } else {
        bitVector[i] -= 1;
      }
    }
  });
  let fingerprint = "";
  for (let i = 0; i < hashBits; i++) {
    fingerprint += bitVector[i] >= 0 ? "1" : "0";
  }
  return fingerprint;
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
