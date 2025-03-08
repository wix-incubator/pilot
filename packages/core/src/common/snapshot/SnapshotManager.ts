import { TestingFrameworkDriver } from "@/types";
import { SnapshotComparator } from "./comparator/SnapshotComparator";

const DEFAULT_POLL_INTERVAL = 500; // ms
const DEFAULT_TIMEOUT = 5000; // ms

export class SnapshotManager {
  constructor(
    private driver: TestingFrameworkDriver,
    private snapshotComparator: SnapshotComparator,
    private downscaleImage: (imagePath: string) => Promise<string> = (
      imagePath: string,
    ) => Promise.resolve(imagePath),
  ) {}

  private async captureSnapshotsUntilStable<T>(
    captureFunc: () => Promise<T | undefined>,
    compareFunc: (current: T, last: T) => Promise<boolean>,
    pollInterval: number = DEFAULT_POLL_INTERVAL,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<T | undefined> {
    const startTime = Date.now();
    let lastSnapshot: T | undefined;

    while (Date.now() - startTime < timeout) {
      const currentSnapshot = await captureFunc();
      if (!currentSnapshot) {
        return undefined;
      }

      if (lastSnapshot) {
        const isStable = await compareFunc(currentSnapshot, lastSnapshot);
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

  private async compareSnapshots(
    current: string,
    last: string,
  ): Promise<boolean> {
    const currentHash = await this.snapshotComparator.generateHashes({
      snapshot: current,
    });
    const lastHash = await this.snapshotComparator.generateHashes({
      snapshot: last,
    });

    return this.snapshotComparator.compareSnapshot(currentHash, lastHash);
  }

  private async captureDownscaledImage(
    useHighlights: boolean,
  ): Promise<string | undefined> {
    const imagePath = await this.driver.captureSnapshotImage(useHighlights);
    if (imagePath) {
      return await this.downscaleImage(imagePath);
    }

    return undefined;
  }

  async captureSnapshotImage(
    useHighlights: boolean,
    pollInterval?: number,
    timeout?: number,
  ): Promise<string | undefined> {
    return this.driver.driverConfig.useSnapshotStabilitySync
      ? await this.captureSnapshotsUntilStable(
          async () => this.captureDownscaledImage(useHighlights),
          async (current, last) => this.compareSnapshots(current, last),
          pollInterval,
          timeout,
        )
      : await this.captureDownscaledImage(useHighlights);
  }

  async captureViewHierarchyString(): Promise<string> {
    return await this.driver.captureViewHierarchyString();
  }
}
