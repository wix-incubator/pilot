import WebTestingFrameworkDriverHelper from "@wix-pilot/web-utils";
import type { ElementMatchingCriteria, Page } from "@wix-pilot/web-utils";
import type {
  TestingFrameworkAPICatalog,
  TestingFrameworkDriver,
  TestingFrameworkDriverConfig,
} from "@wix-pilot/core";
import { baseDriverCategories } from "./baseDriverCategories";
import extendAPICategories from "./extendAPICategories";

export class BaseWebDriver<T extends Page> implements TestingFrameworkDriver {
  private driverUtils: WebTestingFrameworkDriverHelper;

  constructor(private frameworkApiCatalog: TestingFrameworkAPICatalog) {
    this.setCurrentPage = this.setCurrentPage.bind(this);
    this.getCurrentPage = this.getCurrentPage.bind(this);
    this.findElement = this.findElement.bind(this);
    this.driverUtils = new WebTestingFrameworkDriverHelper();
  }

  /**
   * Gets the current page identifier
   */
  getCurrentPage(): T | undefined {
    return this.driverUtils.getCurrentPage() as T | undefined;
  }

  /**
   * Sets the current page identifier, must be set if the driver needs to interact with a specific page
   */
  setCurrentPage(page: T): void {
    this.driverUtils.setCurrentPage(page);
  }

  /**
   * return the closet element given page and element
   */
  async findElement<M extends ElementMatchingCriteria>(
    page: T,
    matchingCriteria: M,
  ): Promise<any> {
    return await this.driverUtils.findElement(page, matchingCriteria);
  }

  /**
   * @inheritdoc
   */
  async captureSnapshotImage(
    useHighlights: boolean,
  ): Promise<string | undefined> {
    return await this.driverUtils.captureSnapshotImage(useHighlights);
  }

  /**
   * @inheritdoc
   */
  async captureViewHierarchyString(): Promise<string> {
    return await this.driverUtils.captureViewHierarchyString();
  }

  /**
   * Get clean DOM from the page content
   * - Removes hidden elements
   * - Removes ads, analytics, tracking elements
   * - Removes unnecessary attributes
   * - Removes empty elements
   * @param page - The page object to extract clean DOM from
   */
  async getCleanDOM(page: T): Promise<string> {
    // Type assertion needed because Page interface doesn't include waitForSelector
    // but both Puppeteer and Playwright pages have it
    const pageWithWait = page as any;
    await pageWithWait.waitForSelector("body");

    return await page.evaluate(() => {
      const copiedDocument = document.cloneNode(true) as Document;

      copiedDocument
        .querySelectorAll('[hidden], [aria-hidden="true"]')
        .forEach((el) => el.remove());

      const removeSelectors = [
        "script",
        "style",
        "link",
        "meta",
        "noscript",
        "iframe",
        '[class*="ads"]',
        '[id*="ads"]',
        '[class*="analytics"]',
        '[class*="tracking"]',
        "footer",
        "header",
        "nav",
        "path",
        "aside",
      ];

      const allowedAttributes = [
        "src",
        "href",
        "alt",
        "title",
        "aria-label",
        "aria-labelledby",
        "aria-describedby",
        "aria-hidden",
        "role",
        "class",
        "id",
        "data-*",
      ];

      copiedDocument.querySelectorAll("*").forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          if (!allowedAttributes.includes(attr.name)) {
            el.removeAttribute(attr.name);
          }
        });

        if (!el.innerHTML.trim()) {
          el.remove();
        }
      });

      removeSelectors.forEach((selector) => {
        copiedDocument.querySelectorAll(selector).forEach((el) => el.remove());
      });

      const mainContent = copiedDocument.body.innerHTML;
      return mainContent.replace(/\s+/g, " ").trim();
    });
  }

  /**
   * Extends a base web api catalog with framework specific methods
   */
  get apiCatalog(): TestingFrameworkAPICatalog {
    return {
      ...this.frameworkApiCatalog,
      context: {
        ...this.frameworkApiCatalog.context,
        getCurrentPage: this.getCurrentPage,
        setCurrentPage: this.setCurrentPage,
        findElement: this.findElement,
      },
      categories: extendAPICategories(
        this.frameworkApiCatalog,
        baseDriverCategories,
      ),
    };
  }

  /**
   * Additional driver configuration.
   *
   * @property useSnapshotStabilitySync - Indicates whether the driver should use wait for screen stability.
   */
  get driverConfig(): TestingFrameworkDriverConfig {
    return { useSnapshotStabilitySync: true };
  }
}
