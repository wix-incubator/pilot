import { SnapshotManager } from "./SnapshotManager";
import { SnapshotComparator } from "./comparator/SnapshotComparator";
import downscaleImage from "./downscaleImage";
import type { TestingFrameworkDriver as FrameworkDriver } from "@/types";

jest.mock("./downscaleImage");
jest.mock("./comparator/SnapshotComparator");

describe("SnapshotManager", () => {
  let snapshotManager: SnapshotManager;
  let mockDriver: Partial<FrameworkDriver>;
  let mockSnapshotComparator: jest.Mocked<SnapshotComparator>;
  let mockDownscaleImage: jest.MockedFunction<typeof downscaleImage>;
  let captureCount = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    captureCount = 0;

    mockDownscaleImage = downscaleImage as jest.MockedFunction<
      typeof downscaleImage
    >;
    mockDownscaleImage.mockImplementation(async (path) => path);

    mockDriver = {
      captureSnapshotImage: jest.fn().mockImplementation(async () => {
        captureCount++;
        // First two calls return the same image
        if (captureCount < 3) {
          return "/path/to/snapshot1.png";
        }
        // Third call returns a different image, causing stability to be achieved
        return "/path/to/snapshot2.png";
      }),
      captureViewHierarchyString: jest.fn().mockResolvedValue("<view></view>"),
      driverConfig: {
        useSnapshotStabilitySync: true,
      },
      apiCatalog: {
        name: "Mock Driver",
        description: "Mock driver for testing",
        context: {},
        categories: [],
      },
    };

    mockSnapshotComparator = {
      generateHashes: jest.fn(),
      compareSnapshot: jest.fn(),
    } as unknown as jest.Mocked<SnapshotComparator>;

    snapshotManager = new SnapshotManager(
      mockDriver as FrameworkDriver,
      mockSnapshotComparator,
      mockDownscaleImage,
    );
  });

  describe("captureViewHierarchyString", () => {
    it("should return view hierarchy from driver", async () => {
      const result = await snapshotManager.captureViewHierarchyString();
      expect(result).toBe("<view></view>");
      expect(mockDriver.captureViewHierarchyString).toHaveBeenCalled();
    });
  });
});
