import fs from "fs";
import path from "path";
import { Page } from "./types";
import { ELEMENT_MATCHING_CONFIG } from "./matchingConfig";
type AttributeKey = keyof typeof ELEMENT_MATCHING_CONFIG;
type ElementMatchingCriteria = {
  [K in AttributeKey]?: ReturnType<
    (typeof ELEMENT_MATCHING_CONFIG)[K]["extract"]
  >;
};

export default class WebTestingFrameworkDriverHelper {
  protected currentPage?: Page;

  constructor() {}

  /**
   * Executes a bundled script within the page context.
   * @param page - The web page instance.
   * @param bundleRelativePath - Relative path to the bundled script.
   * @param returnResult - Whether to return the result of the script execution.
   */
  private async executeBundledScript(
    page: Page,
    bundleRelativePath: string,
  ): Promise<any> {
    const bundlePath = path.resolve(__dirname, bundleRelativePath);
    const bundleString = fs.readFileSync(bundlePath, "utf8");
    await page.evaluate((code: string) => eval(code), bundleString);
  }

  /**
   * Injects bundled code and marks important elements.
   */
  async markImportantElements(page: Page): Promise<void> {
    await this.executeBundledScript(
      page,
      "../dist/markImportantElements.bundle.js",
    );
  }

  /**
   * Manipulates element styles.
   */
  async highlightMarkedElements(page: Page): Promise<void> {
    await this.executeBundledScript(
      page,
      "../dist/highlightMarkedElements.bundle.js",
    );
  }

  /**
   * Cleans up style changes.
   */
  async removeMarkedElementsHighlights(page: Page): Promise<void> {
    await this.executeBundledScript(
      page,
      "../dist/removeMarkedElementsHighlights.bundle.js",
    );
  }

  /**
   * Gets the clean view hierarchy as a string.
   */
  async createMarkedViewHierarchy(page: Page): Promise<string> {
    return await page.evaluate(() => {
      return window.createMarkedViewHierarchy();
    });
  }

  /**
   * Returns the closest element matching the given criteria.
   */
  async findElement(
    page: Page,
    matchingCriteria: ElementMatchingCriteria,
  ): Promise<HTMLElement | null> {
    return (
      await page.evaluateHandle(
        (cretiria) => window.findElement(cretiria),
        matchingCriteria,
      )
    ).asElement() as HTMLElement | null;
  }

  /**
   * Captures a snapshot image.
   */
  async captureSnapshotImage(): Promise<string | undefined> {
    if (!this.currentPage) {
      return undefined;
    }

    const tempDir = "temp";
    const fileName = `snapshot_${Date.now()}.png`;
    const filePath = path.resolve(tempDir, fileName);

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    await this.markImportantElements(this.currentPage);
    await this.highlightMarkedElements(this.currentPage);

    await this.currentPage.screenshot({
      path: filePath,
    });

    await this.removeMarkedElementsHighlights(this.currentPage);
    return filePath;
  }

  /**
   * Captures the view hierarchy as a string.
   */
  async captureViewHierarchyString(): Promise<string> {
    if (!this.currentPage) {
      return (
        "CANNOT SEE ANY ACTIVE PAGE, " +
        "START A NEW ONE BASED ON THE ACTION NEED OR RAISE AN ERROR"
      );
    }

    await this.markImportantElements(this.currentPage);
    return await this.createMarkedViewHierarchy(this.currentPage);
  }

  /**
   * Sets the current working page.
   */
  setCurrentPage(page: Page): void {
    this.currentPage = page;
  }

  /**
   * Gets the current page.
   */
  getCurrentPage(): Page | undefined {
    return this.currentPage;
  }
}
