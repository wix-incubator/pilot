import WebTestingFrameworkDriverHelper from "@wix-pilot/web-utils";
import type { ElementMatchingCriteria, Page } from "@wix-pilot/web-utils";
import {
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
