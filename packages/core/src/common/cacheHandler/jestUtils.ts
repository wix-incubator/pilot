/**
 * Utility functions for working with Jest
 */

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
