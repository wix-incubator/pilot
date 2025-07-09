/**
 * Utility functions for detecting the current test environment and context.
 * These utilities work across different test runners and frameworks.
 */

/**
 * Gets the current test file path from the Jest expect API or the stack trace.
 * This function attempts multiple detection methods to work across different test environments.
 *
 * @returns The current test file path, or undefined if not in a test environment or the path is not available
 */
export function getCurrentTestFilePath(): string | undefined {
  return getCurrentJestTestFilePath() || getCurrentTestFileFromStackTrace();
}

/**
 * Attempts to get the current test file path using Jest's unofficial API.
 * This method is Jest-specific and uses an undocumented API.
 *
 * @returns The test file path from Jest's expect.getState(), or undefined if not available
 */
function getCurrentJestTestFilePath(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { expect } = require("expect");

    if (typeof expect === "function" && typeof expect.getState === "function") {
      // This uses an unofficial Jest API that is not part of the public documentation but is known to work in practice.
      // Use with caution, as it may break in future Jest updates.
      return expect.getState().testPath || undefined;
    }

    return undefined;
  } catch (e) {
    // Fallback in case expect isn't available or the API fails
    return undefined;
  }
}

/**
 * Attempts to get the current test file path by parsing the stack trace.
 * This is a fallback method that works across different test runners.
 *
 * @returns The test file path extracted from stack trace, or undefined if not found
 */
function getCurrentTestFileFromStackTrace(): string | undefined {
  const err = new Error();
  if (!err.stack) {
    return undefined;
  }

  const STACK_TRACE_SEARCH_LINES_LIMIT = 30;
  const stackLines = err.stack
    .split("\n")
    .slice(1, STACK_TRACE_SEARCH_LINES_LIMIT);

  for (const line of stackLines) {
    // Look for test file patterns in the stack trace
    const match = line.match(/\((.*\.(test|spec|e2e)\.[jt]sx?):\d+:\d+\)/);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}
