import { CacheHandler } from "./CacheHandler";
import { mockCache, mockedCacheFile } from "../../test-utils/cache";
import path from "path";
import { SnapshotComparator } from "../snapshot/comparator/SnapshotComparator";
import { SnapshotData, SnapshotHashObject } from "@/types/cache";

jest.mock("fs");
jest.mock("./fileSystem");
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  resolve: jest.fn((p) => p),
  join: jest.fn((...args) => args.join("/")),
  dirname: jest.fn((p) => p.substring(0, p.lastIndexOf("/"))),
  basename: jest.fn((p) => p.substring(p.lastIndexOf("/") + 1)),
}));

jest.mock("../snapshot/comparator/SnapshotComparator", () => {
  return {
    SnapshotComparator: jest.fn().mockImplementation(() => ({
      generateHashes: jest.fn().mockResolvedValue({ BlockHash: 'hash123' }),
      compareSnapshot: jest.fn().mockReturnValue(true)
    }))
  };
});


describe("CacheHandler", () => {
  let cacheHandler: CacheHandler;
  let mockComparator: { generateHashes: jest.Mock; compareSnapshot: jest.Mock };

  beforeEach(() => {
    jest.resetAllMocks();
    cacheHandler = new CacheHandler();
    mockComparator = {
      generateHashes: jest.fn().mockResolvedValue({ BlockHash: 'hash123' }),
      compareSnapshot: jest.fn().mockReturnValue(true)
    };
  });

  describe("cache and file operations", () => {
    it("should load cache from file successfully if the file exists and is valid", () => {
      mockCache({ cacheKey: "value" });

      expect(cacheHandler.getStepFromCache("cacheKey")).toBeUndefined();

      cacheHandler.loadCacheFromFile();

      expect(cacheHandler.getStepFromCache("cacheKey")).toBe("value");
    });

    it("should save cache to file successfully", () => {
      mockCache();

      cacheHandler.addToTemporaryCache("cacheKey", "value");
      cacheHandler.flushTemporaryCache();

      expect(mockedCacheFile).toEqual({ cacheKey: ["value"] });
    });
  });

  describe("addToTemporaryCache", () => {
    it("should not save to cache", () => {
      mockCache();

      cacheHandler.addToTemporaryCache("cacheKey", "value");

      expect(cacheHandler.getStepFromCache("cacheKey")).toBeUndefined();
      expect(mockedCacheFile).toBeUndefined();
    });
  });

  describe("getStepFromCache", () => {
    it("should retrieve a value from cache using getStepFromCache", () => {
      cacheHandler.addToTemporaryCache("some_key", "value");
      cacheHandler.flushTemporaryCache();

      const result = cacheHandler.getStepFromCache("some_key");

      expect(result).toEqual(["value"]);
    });

    it("should return undefined if the key does not exist in cache", () => {
      const result = cacheHandler.getStepFromCache("non_existent_key");

      expect(result).toBeUndefined();
    });

    it("should return undefined when cache override is enabled", () => {
      const handler = new CacheHandler({ shouldOverrideCache: true });
      handler.addToTemporaryCache("key", "value");
      handler.flushTemporaryCache();
      
      const result = handler.getStepFromCache("key");
      
      expect(result).toBeUndefined();
    });
  });

  describe("flushTemporaryCache", () => {
    it("should move all temporary cache entries to the main cache", () => {
      expect(cacheHandler.getStepFromCache("cacheKey1")).toBeUndefined();

      cacheHandler.addToTemporaryCache("cacheKey1", "value1");
      cacheHandler.addToTemporaryCache("cacheKey2", "value2");
      cacheHandler.addToTemporaryCache("cacheKey3", "value3");

      cacheHandler.flushTemporaryCache();

      expect(cacheHandler.getStepFromCache("cacheKey1")).toEqual(["value1"]);
      expect(cacheHandler.getStepFromCache("cacheKey3")).toEqual(["value3"]);
      expect(cacheHandler.getStepFromCache("cacheKey2")).not.toEqual([
        "value3",
      ]);
    });

    it("should get the updated value from cache", () => {
      expect(cacheHandler.getStepFromCache("cacheKey1")).toBeUndefined();

      cacheHandler.addToTemporaryCache("cacheKey1", "value1");
      cacheHandler.addToTemporaryCache("cacheKey1", "value2");

      cacheHandler.flushTemporaryCache();

      expect(cacheHandler.getStepFromCache("cacheKey1")).toEqual([
        "value1",
        "value2",
      ]);
    });
  });

  it("should clear the temporary cache", () => {
    mockCache();
    cacheHandler.addToTemporaryCache("cacheKey", "value");

    expect(cacheHandler.getStepFromCache("cacheKey")).toBeUndefined();

    cacheHandler.clearTemporaryCache();
    cacheHandler.flushTemporaryCache();

    expect(cacheHandler.getStepFromCache("cacheKey")).toBeUndefined();
    expect(mockedCacheFile).toStrictEqual({});
  });

  describe("contextual cache", () => {
    beforeEach(() => {
      (path.resolve as jest.Mock).mockImplementation((p) => p);
    });

    it("should update test file path", () => {
      const handler = new CacheHandler();
      expect(handler.getCallerFilePath()).toBeUndefined();

      const newPath = "/new/path/file.test.ts";
      handler.setCallerFilePath(newPath);
      expect(handler.getCallerFilePath()).toBe(newPath);
      expect(path.resolve).toHaveBeenCalledWith(newPath);
    });

    it("should throw an error when setting empty test file path", () => {
      const handler = new CacheHandler();
      expect(() => {
        handler.setCallerFilePath("");
      }).toThrow("Cannot set empty test file path");
    });

    it("should fallback to __pilot_cache__/global.json when no test file path is set", () => {
      const handler = new CacheHandler();
      handler.loadCacheFromFile();

      expect(path.resolve).toHaveBeenCalledWith(
        expect.any(String),
        "__pilot_cache__",
        "global.json",
      );
    });

    it("should check if cache is enabled", () => {
      const handler1 = new CacheHandler({ shouldUseCache: true });
      expect(handler1.isCacheInUse()).toBe(true);

      const handler2 = new CacheHandler({ shouldUseCache: false });
      expect(handler2.isCacheInUse()).toBe(false);

      const handler3 = new CacheHandler({});
      expect(handler3.isCacheInUse()).toBe(true); // Default is true
    });
  });

  describe("hash generation", () => {
    it("should generate view hierarchy hash correctly", () => {
      const viewHierarchy = "<view><button>Test</button></view>";
      const hash = cacheHandler.hashViewHierarchy(viewHierarchy);
      
      expect(hash).toEqual(expect.any(String));
      expect(hash.length).toBe(32); // MD5 hash is 32 characters
    });

    it("should generate snapshot hash using the comparator", async () => {
      const snapshot = "base64-encoded-snapshot";
      const expectedHash = { BlockHash: 'hash123' };
      
      const result = await cacheHandler.generateSnapshotHash(snapshot, mockComparator as unknown as SnapshotComparator);
      
      expect(mockComparator.generateHashes).toHaveBeenCalledWith(snapshot);
      expect(result).toEqual(expectedHash);
    });

    it("should return undefined when snapshot is undefined", async () => {
      const result = await cacheHandler.generateSnapshotHash(undefined, mockComparator as unknown as SnapshotComparator);
      
      expect(mockComparator.generateHashes).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("should generate both hashes with generateCacheHashes", async () => {
      const viewHierarchy = "<view><button>Test</button></view>";
      const snapshot = "base64-encoded-snapshot";
      const expectedSnapshotHash = { BlockHash: 'hash123' };
      
      const result = await cacheHandler.generateCacheHashes(
        viewHierarchy,
        snapshot,
        mockComparator as unknown as SnapshotComparator
      );
      
      expect(result).toEqual({
        viewHierarchyHash: expect.any(String),
        snapshotHash: expectedSnapshotHash
      });
    });
  });

  describe("generateCacheKey", () => {
    it("should return a valid cache key with correct structure", () => {
      const identifier = "step1";
      const previous = [{ data: "value1" }, { data: "value2" }];
      const mapFn = (item: any) => ({ mapped: item.data });
      
      const result = cacheHandler.generateCacheKey(identifier, previous, {
        keyName: "currentStep",
        previousKeyName: "previousSteps",
        mapFn
      });
      
      expect(result).toBeDefined();
      const parsed = JSON.parse(result!);
      expect(parsed).toEqual({
        currentStep: "step1",
        previousSteps: [
          { mapped: "value1" },
          { mapped: "value2" }
        ]
      });
    });
    
    it("should return undefined when cache is disabled", () => {
      const handler = new CacheHandler({ shouldUseCache: false });
      
      const result = handler.generateCacheKey("step", [], {
        keyName: "step",
        previousKeyName: "previous",
        mapFn: (item) => item
      });
      
      expect(result).toBeUndefined();
    });
  });

  describe("findInCache", () => {
    type TestSnapshotData = SnapshotData & { code: string };
    
    const mockViewHierarchy = "<view><button>Test</button></view>";
    const mockSnapshot = "base64-encoded-snapshot";
    let cachedValues: TestSnapshotData[];
    
    beforeEach(() => {
      jest.spyOn(cacheHandler, 'hashViewHierarchy').mockReturnValue('viewHashXYZ');
      jest.spyOn(cacheHandler, 'generateSnapshotHash').mockResolvedValue({ BlockHash: 'snapHashABC' });
      
      cachedValues = [
        {
          viewHierarchyHash: "wrongViewHash",
          snapshotHash: { BlockHash: 'wrongSnapHash' },
          code: "wrong code"
        },
        {
          viewHierarchyHash: "viewHashXYZ",
          snapshotHash: { BlockHash: 'snapHashABC' },
          code: "correct code"
        }
      ];
    });
    
    it("should find entry by snapshot hash when snapshot is provided", async () => {
      mockComparator.compareSnapshot.mockImplementation((hash1, hash2) => {
        return hash1.BlockHash === 'snapHashABC' && hash2.BlockHash === 'snapHashABC';
      });
      
      const result = await cacheHandler.findInCache<TestSnapshotData>(
        cachedValues,
        mockViewHierarchy,
        mockSnapshot,
        mockComparator as unknown as SnapshotComparator
      );
      
      expect(cacheHandler.generateSnapshotHash).toHaveBeenCalledWith(mockSnapshot, mockComparator);
      expect(mockComparator.compareSnapshot).toHaveBeenCalled();
      expect(result).toEqual(cachedValues[1]);
    });
    
    it("should find entry by view hierarchy hash when no snapshot match is found", async () => {
      // Make snapshot comparison fail
      mockComparator.compareSnapshot.mockReturnValue(false);
      
      const result = await cacheHandler.findInCache<TestSnapshotData>(
        cachedValues,
        mockViewHierarchy,
        mockSnapshot,
        mockComparator as unknown as SnapshotComparator
      );
      
      expect(cacheHandler.hashViewHierarchy).toHaveBeenCalledWith(mockViewHierarchy);
      expect(result).toEqual(cachedValues[1]);
    });
    
    it("should find entry by view hierarchy hash when no snapshot is provided", async () => {
      const result = await cacheHandler.findInCache<TestSnapshotData>(
        cachedValues,
        mockViewHierarchy,
        undefined,
        mockComparator as unknown as SnapshotComparator
      );
      
      expect(cacheHandler.generateSnapshotHash).not.toHaveBeenCalled();
      expect(mockComparator.compareSnapshot).not.toHaveBeenCalled();
      expect(cacheHandler.hashViewHierarchy).toHaveBeenCalledWith(mockViewHierarchy);
      expect(result).toEqual(cachedValues[1]);
    });
    
    it("should return undefined when no match is found", async () => {
      // Make both snapshot and view hierarchy comparisons fail
      mockComparator.compareSnapshot.mockReturnValue(false);
      jest.spyOn(cacheHandler, 'hashViewHierarchy').mockReturnValue('nonExistentHash');
      
      const result = await cacheHandler.findInCache<TestSnapshotData>(
        cachedValues,
        mockViewHierarchy,
        mockSnapshot,
        mockComparator as unknown as SnapshotComparator
      );
      
      expect(result).toBeUndefined();
    });
  });
});
