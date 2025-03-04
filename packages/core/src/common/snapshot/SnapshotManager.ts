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

  private async waitForStableState<T>(
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

  private async waitForStableStateWithObserver<T>(
    captureFunc: () => Promise<T | undefined>,
    stabilityDelay: number = DEFAULT_POLL_INTERVAL,
    overallTimeout: number = DEFAULT_TIMEOUT,
  ): Promise<T | undefined> {
    let lastSnapshot: T | undefined = await captureFunc();
    let stabilityTimer: ReturnType<typeof setTimeout>;

    return new Promise<T | undefined>((resolve) => {
      const observer = new MutationObserver(async () => {
        if (stabilityTimer) clearTimeout(stabilityTimer);

        lastSnapshot = await captureFunc();

        stabilityTimer = setTimeout(() => {
          observer.disconnect();
          resolve(lastSnapshot);
        }, stabilityDelay);
      });

      observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(lastSnapshot);
      }, overallTimeout);
    });
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

  private async captureDownscaledImage(): Promise<string | undefined> {
    const imagePath = await this.driver.captureSnapshotImage();
    if (imagePath) {
      const downscaledImagePath = await this.downscaleImage(imagePath);
      return downscaledImagePath;
    }
  }

  async captureSnapshotImage(
    pollInterval?: number,
    timeout?: number,
    stabilityThreshold: number = DEFAULT_STABILITY_THRESHOLD,
  ): Promise<string | undefined> {
    return this.waitForStableState(
      async () => this.captureDownscaledImage(),
      (current, last) =>
        this.compareSnapshots(current, last, stabilityThreshold),
      pollInterval,
      timeout,
    );
  }

  async captureViewHierarchyString(timeout?: number): Promise<string> {
    const result = await this.waitForStableStateWithObserver(
      () => this.driver.captureViewHierarchyString(),
      DEFAULT_POLL_INTERVAL,
      timeout || DEFAULT_TIMEOUT,
    );
    return result ?? "";
  }
}
