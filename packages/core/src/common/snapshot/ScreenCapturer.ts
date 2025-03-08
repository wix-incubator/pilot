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

      loggerSpinner.stop("success", "Screen captured successfully");

      return {
        snapshot,
        viewHierarchy: viewHierarchy!,
      };
    } catch (error) {
      logger.info("Screen capture failed:", {
        message: String(error),
        color: "red",
        isBold: false,
      });
      loggerSpinner.stop("failure", "Failed to capture the screen");
      throw error;
    }
  }
}
