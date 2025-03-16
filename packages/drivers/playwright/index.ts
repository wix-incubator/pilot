import {
  TestingFrameworkAPICatalog,
  TestingFrameworkDriverConfig,
} from "@wix-pilot/core";
import * as playwright from "playwright";
import { BaseWebDriver } from "@wix-pilot/basewebdriver";

export class PlaywrightFrameworkDriver extends BaseWebDriver<playwright.Page> {
  constructor(apiCatalog: TestingFrameworkAPICatalog) {
    const driverConfig: TestingFrameworkDriverConfig = {
      useSnapshotStabilitySync: true,
    };
    super(apiCatalog, driverConfig);
  }
}
