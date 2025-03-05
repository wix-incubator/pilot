import { SnapshotManager } from "./SnapshotManager";
import { TestingFrameworkDriver } from "@/types";
import { SnapshotComparator } from "./comparator/SnapshotComparator";

describe("SnapshotManager", () => {
  let mockDriver: jest.Mocked<TestingFrameworkDriver>;
  let mockSnapshotComparator: jest.Mocked<SnapshotComparator>;
  let snapshotManager: SnapshotManager;
  let mockDownscaleImage: jest.Mock;

  beforeEach(() => {
    mockDriver = {
      captureSnapshotImage: jest.fn(),
      captureViewHierarchyString: jest.fn(),
      driverConfig: { useSnapshotStabilitySync: true },
    } as any;

    mockSnapshotComparator = {
      generateHashes: jest.fn(),
      compareSnapshot: jest.fn(),
    } as any;

    // Create a mock for downscaleImage
    mockDownscaleImage = jest.fn();

    snapshotManager = new SnapshotManager(
      mockDriver,
      mockSnapshotComparator,
      mockDownscaleImage,
    );
    mockDownscaleImage.mockImplementation(async (imagePath) => imagePath);
    // Clear mocks
    jest.clearAllMocks();
  });

  describe("captureSnapshotImage", () => {
    it("should return stable snapshot when UI becomes stable", async () => {
      const snapshots = [
        "/path/to/snapshot1.png",
        "/path/to/snapshot2.png",
        "/path/to/snapshot2.png",
      ];
      let callCount = 0;

      mockDriver.captureSnapshotImage.mockImplementation(async () => {
        return snapshots[callCount++];
      });

      const imagePathToHash: { [key: string]: string } = {
        "/path/to/snapshot1.png": "hash1",
        "/path/to/snapshot2.png": "hash2",
      };

      mockSnapshotComparator.generateHashes.mockImplementation(
        async (snapshot: string) => {
          return {
            BlockHash: imagePathToHash[snapshot],
            Phash: imagePathToHash[snapshot],
          };
        },
      );

      mockSnapshotComparator.compareSnapshot.mockImplementation(
        (hash1, hash2) => {
          return hash1.BlockHash === hash2.BlockHash;
        },
      );

      const resultPromise = snapshotManager.captureSnapshotImage(100);

      // Wait for the snapshots to be captured and compared
      await new Promise((resolve) => setTimeout(resolve, 300));

      const result = await resultPromise;

      expect(result).toBe("/path/to/snapshot2.png");
      expect(mockDriver.captureSnapshotImage).toHaveBeenCalledTimes(3);
      expect(mockSnapshotComparator.generateHashes).toHaveBeenCalledTimes(4);
      expect(mockSnapshotComparator.compareSnapshot).toHaveBeenCalledTimes(2);

      expect(mockDownscaleImage).toHaveBeenCalledTimes(3);
      expect(mockDownscaleImage).toHaveBeenNthCalledWith(
        1,
        "/path/to/snapshot1.png",
      );
      expect(mockDownscaleImage).toHaveBeenNthCalledWith(
        2,
        "/path/to/snapshot2.png",
      );
      expect(mockDownscaleImage).toHaveBeenNthCalledWith(
        3,
        "/path/to/snapshot2.png",
      );
    });

    it("should return last snapshot when timeout is reached", async () => {
      const snapshots = [
        "/path/to/snapshot1.png",
        "/path/to/snapshot2.png",
        "/path/to/snapshot3.png",
        "/path/to/snapshot4.png",
      ];
      let callCount = 0;

      mockDriver.captureSnapshotImage.mockImplementation(async () => {
        return snapshots[callCount++];
      });

      const imagePathToHash: { [key: string]: string } = {
        "/path/to/snapshot1.png": "hash1",
        "/path/to/snapshot2.png": "hash2",
        "/path/to/snapshot3.png": "hash3",
        "/path/to/snapshot4.png": "hash4",
      };

      mockSnapshotComparator.generateHashes.mockImplementation(
        async (snapshot: string) => {
          return {
            BlockHash: imagePathToHash[snapshot],
            Phash: imagePathToHash[snapshot],
          };
        },
      );

      mockSnapshotComparator.compareSnapshot.mockReturnValue(false);

      const resultPromise = snapshotManager.captureSnapshotImage(100, 250);

      // Wait for the timeout to be reached
      await new Promise((resolve) => setTimeout(resolve, 300));

      const result = await resultPromise;

      expect(result).toBe("/path/to/snapshot3.png");
      expect(mockDriver.captureSnapshotImage).toHaveBeenCalledTimes(3);
      expect(mockDownscaleImage).toHaveBeenCalledTimes(3);
    });

    it("should handle undefined snapshots", async () => {
      mockDriver.captureSnapshotImage.mockResolvedValue(undefined);

      const result = await snapshotManager.captureSnapshotImage();

      expect(result).toBeUndefined();
      expect(mockDriver.captureSnapshotImage).toHaveBeenCalledTimes(1);
      expect(mockSnapshotComparator.generateHashes).not.toHaveBeenCalled();
      expect(mockDownscaleImage).not.toHaveBeenCalled();
    });
  });

  describe("captureViewHierarchyString", () => {
    it("should return view hierarchy when called", async () => {
      mockDriver.captureViewHierarchyString.mockResolvedValue("<view>2</view>");
      const result = await snapshotManager.captureViewHierarchyString();
      expect(result).toBe("<view>2</view>");
      expect(mockDriver.captureViewHierarchyString).toHaveBeenCalledTimes(1);
    });

    it("should handle empty view hierarchy", async () => {
      mockDriver.captureViewHierarchyString.mockResolvedValue("");
      const result = await snapshotManager.captureViewHierarchyString();
      expect(result).toBe("");
      expect(mockDriver.captureViewHierarchyString).toHaveBeenCalledTimes(1);
    });
  });
});
