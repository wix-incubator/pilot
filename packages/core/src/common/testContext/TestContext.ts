import { TestContextConfig } from "@/types/core";
import { getCurrentTestFilePath as defaultGetCurrentTestFilePath } from "./testEnvUtils";

/**
 * Test context that provides information about the current test execution environment.
 * Handles defaults internally so consumers always get working functionality.
 */
export class TestContext {
  public readonly getCurrentTestFilePath: () => string | undefined;

  constructor(config: TestContextConfig = {}) {
    this.getCurrentTestFilePath =
      config.getCurrentTestFilePath ?? defaultGetCurrentTestFilePath;
  }
}
