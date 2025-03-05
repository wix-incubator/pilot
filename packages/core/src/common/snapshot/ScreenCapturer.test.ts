import { ScreenCapturer } from "@/common/snapshot/ScreenCapturer";
import { SnapshotManager } from "@/common/snapshot/SnapshotManager";
import { PromptHandler } from "@/types";

describe("ScreenCapturer", () => {
  let mockSnapshotManager: jest.Mocked<SnapshotManager>;
  let mockPromptHandler: jest.Mocked<PromptHandler>;
  let screenCapturer: ScreenCapturer;

  beforeEach(() => {
    mockSnapshotManager = {
      captureSnapshotImage: jest.fn(),
      captureViewHierarchyString: jest.fn(),
    } as any;

    mockPromptHandler = {
      isSnapshotImageSupported: jest.fn(),
    } as any;

    screenCapturer = new ScreenCapturer(mockSnapshotManager, mockPromptHandler);
  });

  it("should capture snapshot and view hierarchy when snapshot images are supported", async () => {
    mockPromptHandler.isSnapshotImageSupported.mockReturnValue(true);
    mockSnapshotManager.captureSnapshotImage.mockResolvedValue("snapshot_data");
    mockSnapshotManager.captureViewHierarchyString.mockResolvedValue(
      "view_hierarchy_data",
    );

    const result = await screenCapturer.capture(true);

    expect(mockPromptHandler.isSnapshotImageSupported).toHaveBeenCalled();
    expect(mockSnapshotManager.captureSnapshotImage).toHaveBeenCalled();
    expect(mockSnapshotManager.captureViewHierarchyString).toHaveBeenCalled();

    expect(result).toEqual({
      snapshot: "snapshot_data",
      viewHierarchy: "view_hierarchy_data",
      isSnapshotImageAttached: true,
    });
  });

  it("should capture only view hierarchy when snapshot images are not supported", async () => {
    mockPromptHandler.isSnapshotImageSupported.mockReturnValue(false);
    mockSnapshotManager.captureViewHierarchyString.mockResolvedValue(
      "view_hierarchy_data",
    );

    const result = await screenCapturer.capture(true);

    expect(mockPromptHandler.isSnapshotImageSupported).toHaveBeenCalled();
    expect(mockSnapshotManager.captureSnapshotImage).not.toHaveBeenCalled();
    expect(mockSnapshotManager.captureViewHierarchyString).toHaveBeenCalled();

    expect(result).toEqual({
      snapshot: undefined,
      viewHierarchy: "view_hierarchy_data",
      isSnapshotImageAttached: false,
    });
  });

  it("should handle when snapshot image capture returns null", async () => {
    mockPromptHandler.isSnapshotImageSupported.mockReturnValue(true);
    mockSnapshotManager.captureSnapshotImage.mockResolvedValue(undefined);
    mockSnapshotManager.captureViewHierarchyString.mockResolvedValue(
      "view_hierarchy_data",
    );

    const result = await screenCapturer.capture(true);

    expect(mockPromptHandler.isSnapshotImageSupported).toHaveBeenCalled();
    expect(mockSnapshotManager.captureSnapshotImage).toHaveBeenCalledWith(true);
    expect(mockSnapshotManager.captureViewHierarchyString).toHaveBeenCalled();

    expect(result).toEqual({
      snapshot: undefined,
      viewHierarchy: "view_hierarchy_data",
      isSnapshotImageAttached: false,
    });
  });

  it("should handle when captureViewHierarchyString throws an error", async () => {
    mockPromptHandler.isSnapshotImageSupported.mockReturnValue(true);
    mockSnapshotManager.captureSnapshotImage.mockResolvedValue("snapshot_data");
    mockSnapshotManager.captureViewHierarchyString.mockRejectedValue(
      new Error("Failed to capture view hierarchy"),
    );
    await expect(screenCapturer.capture(true)).rejects.toThrow(
      "Failed to capture view hierarchy",
    );

    expect(mockPromptHandler.isSnapshotImageSupported).toHaveBeenCalled();
    expect(mockSnapshotManager.captureSnapshotImage).toHaveBeenCalled();
    expect(mockSnapshotManager.captureViewHierarchyString).toHaveBeenCalled();
  });

  it("should pass useHighlights = false to captureSnapshotImage", async () => {
    mockPromptHandler.isSnapshotImageSupported.mockReturnValue(true);
    mockSnapshotManager.captureSnapshotImage.mockResolvedValue("snapshot_data");
    mockSnapshotManager.captureViewHierarchyString.mockResolvedValue(
      "view_hierarchy_data",
    );

    await screenCapturer.capture(false);

    expect(mockSnapshotManager.captureSnapshotImage).toHaveBeenCalledWith(false);
  });

  it("should pass useHighlights = true to captureSnapshotImage", async () => {
      mockPromptHandler.isSnapshotImageSupported.mockReturnValue(true);
      mockSnapshotManager.captureSnapshotImage.mockResolvedValue("snapshot_data");
      mockSnapshotManager.captureViewHierarchyString.mockResolvedValue(
          "view_hierarchy_data",
      );

      await screenCapturer.capture(true);

      expect(mockSnapshotManager.captureSnapshotImage).toHaveBeenCalledWith(true);
    });
});
