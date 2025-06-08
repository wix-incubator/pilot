import crypto from "crypto";
const DEFAULT_POLL_INTERVAL = 500; // ms
const DEFAULT_TIMEOUT = 5000; // ms

/** Waits till the view hierarchy is stable than returns it*/
export async function waitForStableState(
  pollInterval: number = DEFAULT_POLL_INTERVAL,
  timeout: number = DEFAULT_TIMEOUT,
): Promise<string | undefined> {
  const startTime = Date.now();
  let lastSnapshot: string | undefined;

  while (Date.now() - startTime < timeout) {
    const currentSnapshot: string = (await getCleanPageSource()) || "";
    if (!currentSnapshot) {
      return undefined;
    }

    if (lastSnapshot) {
      const isStable = compareViewHierarchies(currentSnapshot, lastSnapshot);
      if (isStable) {
        return currentSnapshot;
      }
    }

    lastSnapshot = currentSnapshot;
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Return the last snapshot if timeout is reached
  return lastSnapshot;
}

async function getCleanPageSource(): Promise<string> {
  const fullPageSource = await driver.getPageSource();

  return fullPageSource
    .replace(/\s+value="[^"]*"/g, "")
    .replace(/\s+label="[^"]*"/g, "");
}

export function compareViewHierarchies(current: string, last: string): boolean {
  // Use MD5 for fast comparison of view hierarchies
  const currentHash = crypto.createHash("md5").update(current).digest("hex");
  const lastHash = crypto.createHash("md5").update(last).digest("hex");
  return currentHash === lastHash;
}
