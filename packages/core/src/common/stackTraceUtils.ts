/**
 * Utilities for stack trace analysis and caller detection
 */

import logger from "@/common/logger";

/**
 * Gets the current test file path from Jest's globals
 * @returns The current Jest test file path, or undefined if not in Jest
 */
export function getCurrentJestTestFilePath(): string | undefined {
  if (
    // @ts-expect-error - Jest global
    typeof globalThis.expect === "function" &&
    // @ts-expect-error - Jest global
    typeof globalThis.expect.getState === "function"
  ) {
    // @ts-expect-error - Jest global
    const { testPath } = globalThis.expect.getState();
    return testPath;
  }
  return undefined;
}

/**
 * Determines the caller file path by analyzing the stack trace
 * @param skipFrames Number of frames to skip from the top of the stack
 * @returns The file path that called the method, or undefined if it couldn't be determined
 */
export function determineCalleeFilePath(
  skipFrames: number = 3,
): string | undefined {
  // First try to get from Jest globals
  const testData = getCurrentJestTestFilePath();
  if (testData) {
    return testData;
  }

  // Fallback to stack trace analysis
  try {
    const stackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 20;
    const stack = new Error().stack || "";
    Error.stackTraceLimit = stackTraceLimit;

    // Skip frames which are within the framework..
    const lines = stack.split("\n").slice(skipFrames);

    for (const line of lines) {
      // Check different stack trace formats to be more resilient
      let match = line.match(/at .+ \((.+\.(?:js|ts|jsx|tsx)):(\d+):(\d+)\)/);

      // Alternative format without parentheses
      if (!match) {
        match = line.match(/at (.+\.(?:js|ts|jsx|tsx)):(\d+):(\d+)/);
      }

      if (
        match &&
        !match[1].includes("node_modules") &&
        !match[1].includes("/dist/")
      ) {
        return match[1];
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : error;
    logger.warn(
      `Failed to determine caller file path from stack trace: ${errorMessage}`,
    );
  }

  return undefined;
}
