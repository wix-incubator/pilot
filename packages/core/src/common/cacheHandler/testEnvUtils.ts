/**
 * Utility functions for working with Jest
 */

/**
 * Gets the current test file path from the Jest expect API or the stack trace
 * @returns The current Jest test file path, or undefined if not in Jest or the path is not available
 */
export function getCurrentTestFilePath(): string | undefined {
  return getCurrentJestTestFilePathFrom() || getCurrentTestFileFromStackTrace();
}

function getCurrentJestTestFilePathFrom(): string | undefined {
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

function getCurrentTestFileFromStackTrace() {
  const err = new Error();
  if (!err.stack) {
    return undefined;
  }

  const STACK_TRACE_SEARCH_LINES_LIMIT = 30;
  const stackLines = err.stack
    .split("\n")
    .slice(1, STACK_TRACE_SEARCH_LINES_LIMIT);

  for (const line of stackLines) {
    const match = line.match(/\((.*\.(test|spec|e2e)\.[jt]sx?):\d+:\d+\)/);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}
