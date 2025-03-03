import { TestingFrameworkDriver } from "@/types";
import { SnapshotComparator } from "./comparator/SnapshotComparator";

const DEFAULT_POLL_INTERVAL = 500; // ms
const DEFAULT_TIMEOUT = 5000; // ms
const DEFAULT_STABILITY_THRESHOLD = 0.05;

export class SnapshotManager {
  constructor(
    private driver: TestingFrameworkDriver,
    private snapshotComparator: SnapshotComparator,
    private downscaleImage: (
      imagePath: string,
    ) => Promise<string> = downscaleImage,
  ) {}

  private async captureSnapshotsUntilStable<T>(
    captureFunc: () => Promise<T | undefined>,
    compareFunc: (current: T, last: T) => Promise<boolean> | boolean,
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
    stabilityThreshold: number,
  ): Promise<boolean> {
    const currentHash = await this.snapshotComparator.generateHashes(current);
    const lastHash = await this.snapshotComparator.generateHashes(last);

    return this.snapshotComparator.compareSnapshot(
      currentHash,
      lastHash,
      stabilityThreshold,
    );
  }

  private async captureDownscaledImage(shouldHighlightSnapshot: boolean,): Promise<string | undefined> {
    const imagePath = await this.driver.captureSnapshotImage(shouldHighlightSnapshot);
    if (imagePath) {
      const downscaledImagePath = await this.downscaleImage(imagePath);
      return downscaledImagePath;
    }
  }

  async captureSnapshotImage(
    shouldHighlightSnapshot: boolean,
    pollInterval?: number,
    timeout?: number,
    stabilityThreshold: number = DEFAULT_STABILITY_THRESHOLD,
  ): Promise<string | undefined> {
    return this.driver.driverConfig.useSnapshotStabilitySync
      ? this.captureSnapshotsUntilStable(
          async () => this.captureDownscaledImage(shouldHighlightSnapshot),
          (current, last) =>
            this.compareSnapshots(current, last, stabilityThreshold),
          pollInterval,
          timeout,
        )
      : await this.captureDownscaledImage(shouldHighlightSnapshot);
  }

  async captureViewHierarchyString(): Promise<string> {
    return await this.driver.captureViewHierarchyString();
  }
}
