import { SnapshotManager } from "./SnapshotManager";
import { PromptHandler, ScreenCapturerResult } from "@/types";
import logger from "@/common/logger";

export class ScreenCapturer {
  constructor(
    private snapshotManager: SnapshotManager,
    private promptHandler: PromptHandler,
  ) {}

  async capture(useHighlights: boolean): Promise<ScreenCapturerResult> {
    const progress = logger.startProgress(
      {
        actionLabel: "CAPTURE",
        successLabel: "CAPTURED",
        failureLabel: "FAILED",
      },
      "Taking screenshot of current screen",
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

      progress.stop("success", "Screenshot captured successfully");

      return {
        snapshot,
        viewHierarchy: viewHierarchy!,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      progress.stop("failure", `Screen capture failed: ${errorMessage}`);

      throw error;
    }
  }
}
