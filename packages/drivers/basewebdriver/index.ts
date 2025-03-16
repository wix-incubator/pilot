import WebTestingFrameworkDriverHelper from "@wix-pilot/web-utils";
import type { ElementMatchingCriteria, Page } from "@wix-pilot/web-utils";
import type { TestingFrameworkAPICatalog } from "@wix-pilot/core";
import { baseDriverCategories } from "./baseDriverCategories";
import { extendAPICategories } from "./extendApiCatalog";

export class BaseWebDriver {
  private driverUtils: WebTestingFrameworkDriverHelper;

  constructor() {
    this.setCurrentPage = this.setCurrentPage.bind(this);
    this.getCurrentPage = this.getCurrentPage.bind(this);
    this.findElement = this.findElement.bind(this);
    this.driverUtils = new WebTestingFrameworkDriverHelper();
  }

  /**
   * Gets the current page identifier
   */
  getCurrentPage(): Page | undefined {
    return this.driverUtils.getCurrentPage() as Page | undefined;
  }

  /**
   * Sets the current page identifier, must be set if the driver needs to interact with a specific page
   */
  setCurrentPage(page: Page): void {
    this.driverUtils.setCurrentPage(page);
  }

  /**
   * return the closet element given page and element
   */
  async findElement<T extends ElementMatchingCriteria>(
    page: Page,
    matchingCriteria: T,
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
   * Extends a base web api catalog with framework specific methods
   */
  createApiCatalog(
    apiCatalog: TestingFrameworkAPICatalog,
  ): TestingFrameworkAPICatalog {
    return {
      ...apiCatalog,
      context: {
        ...apiCatalog.context,
        getCurrentPage: this.getCurrentPage,
        setCurrentPage: this.setCurrentPage,
        findElement: this.findElement,
      },
      categories: extendAPICategories(apiCatalog, baseDriverCategories),
    };
  }
}
