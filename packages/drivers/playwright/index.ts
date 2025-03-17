import { TestingFrameworkDriverConfig } from "@wix-pilot/core";
import * as playwright from "playwright";
import { BaseWebDriver } from "@wix-pilot/basewebdriver";
import { createAPICatalog } from "./frameworkCatalog";

export class PlaywrightFrameworkDriver extends BaseWebDriver<playwright.Page> {
  constructor() {
    const driverConfig: TestingFrameworkDriverConfig = {
      useSnapshotStabilitySync: true,
    };
    super(createAPICatalog, driverConfig);
  }
}
