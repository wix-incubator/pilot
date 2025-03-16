import {
  TestingFrameworkDriverConfig,
  TestingFrameworkAPICatalog,
} from "@wix-pilot/core";
import * as puppeteer from "puppeteer-core";
import { BaseWebDriver } from "@wix-pilot/basewebdriver";

export class PuppeteerFrameworkDriver extends BaseWebDriver<puppeteer.Page> {
  constructor(apiCatalog: TestingFrameworkAPICatalog) {
    const driverConfig: TestingFrameworkDriverConfig = {
      useSnapshotStabilitySync: true,
    };
    super(apiCatalog, driverConfig);
  }
}
