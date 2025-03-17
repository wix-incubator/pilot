import * as playwright from "playwright";
import { BaseWebDriver } from "@wix-pilot/basewebdriver";
import { createAPICatalog } from "./frameworkCatalog";

export class PlaywrightFrameworkDriver extends BaseWebDriver<playwright.Page> {
  constructor() {
    super(createAPICatalog);
  }
}
