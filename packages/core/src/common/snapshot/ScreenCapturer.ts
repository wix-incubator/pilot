import { SnapshotManager } from "./SnapshotManager";
import { PromptHandler, ScreenCapturerResult } from "@/types";
import logger from "@/common/logger";

export class ScreenCapturer {
  constructor(
    private snapshotManager: SnapshotManager,
    private promptHandler: PromptHandler,
  ) {}

  async capture(useHighlights: boolean): Promise<ScreenCapturerResult> {
    const loggerSpinner = logger.startSpinner(
      "Waiting for the screen to reach a stable state...",
    );

    try {
      const shouldCaptureSnapshot =
        this.promptHandler.isSnapshotImageSupported();

      const [snapshot, viewHierarchy] = await Promise.all([
        shouldCaptureSnapshot
          ? this.snapshotManager.captureSnapshotImage(useHighlights)
          : Promise.resolve(undefined),
        this.snapshotManager.captureViewHierarchyString(),
      ]);

      loggerSpinner.stop(
        "success",
        "Screen has reached a stable state, captured the screen",
      );

      return {
        snapshot,
        viewHierarchy: viewHierarchy!,
        isSnapshotImageAttached: snapshot != null && shouldCaptureSnapshot,
      };
    } catch (error) {
      loggerSpinner.stop("failure", "Failed to capture the screen");
      throw error;
    }
  }
}
