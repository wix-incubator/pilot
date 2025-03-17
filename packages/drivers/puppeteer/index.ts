import { TestingFrameworkDriverConfig } from "@wix-pilot/core";
import * as puppeteer from "puppeteer-core";
import { BaseWebDriver } from "@wix-pilot/basewebdriver";
import { createAPICatalog } from "./frameworkCatalog";

export class PuppeteerFrameworkDriver extends BaseWebDriver<puppeteer.Page> {
  constructor(executablePath: string) {
    const driverConfig: TestingFrameworkDriverConfig = {
      useSnapshotStabilitySync: true,
    };
    super(createAPICatalog(executablePath), driverConfig);
  }
}
