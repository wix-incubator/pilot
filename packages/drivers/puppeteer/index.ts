import * as puppeteer from "puppeteer-core";
import { BaseWebDriver } from "@wix-pilot/basewebdriver";
import { createAPICatalog } from "./frameworkCatalog";

export class PuppeteerFrameworkDriver extends BaseWebDriver<puppeteer.Page> {
  constructor(executablePath: string) {
    super(createAPICatalog(executablePath));
  }
}
