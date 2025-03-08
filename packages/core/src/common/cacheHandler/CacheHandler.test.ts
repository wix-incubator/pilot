import { CacheHandler } from "./CacheHandler";
import { mockCache, mockedCacheFile } from "../../test-utils/cache";
import { SnapshotComparator } from "../snapshot/comparator/SnapshotComparator";
import type { ScreenCapturerResult } from "@/types";
import fs from "fs";

jest.mock("fs");
jest.mock("../snapshot/comparator/SnapshotComparator");

describe("CacheHandler", () => {
  let cacheHandler: CacheHandler;
  let mockSnapshotComparator: jest.Mocked<SnapshotComparator>;

  const mockScreenCapture = {
    screenshot: Buffer.from("test-screenshot"),
    viewHierarchy: JSON.stringify({ type: "root", children: [] }),
  } as ScreenCapturerResult;

  const mockHashes = {
    BlockHash: "abc123",
    ViewHierarchyHash: "xyz789",
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockSnapshotComparator = {
      generateHashes: jest.fn().mockResolvedValue(mockHashes),
      compareSnapshot: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<SnapshotComparator>;

    cacheHandler = new CacheHandler(
      mockSnapshotComparator as unknown as SnapshotComparator,
    );
  });

  describe("cache and file operations", () => {
    it("should load cache from file successfully if the file exists and is valid", () => {
      const cacheValue = {
        value: "test-value",
        creationTime: Date.now(),
        lastAccessTime: Date.now(),
        snapshotHashes: mockHashes,
      };

      mockCache({ cacheKey: [cacheValue] });

      expect(cacheHandler.getFromPersistentCache("cacheKey")).toBeUndefined();

      cacheHandler.loadCacheFromFile();

      const result = cacheHandler.getFromPersistentCache("cacheKey");
      expect(result).toEqual([cacheValue]);
    });

    it("should save cache to file successfully", () => {
      mockCache();

      cacheHandler.addToTemporaryCache("cacheKey", "test-value");
      cacheHandler.flushTemporaryCache();

      expect(mockedCacheFile).toHaveProperty("cacheKey");
      expect(mockedCacheFile?.cacheKey[0].value).toEqual("test-value");
    });

    it("should handle file errors gracefully when loading cache", () => {
      const mockError = new Error("Test error");
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      expect(() => cacheHandler.loadCacheFromFile()).not.toThrow();
    });

    it("should handle file errors gracefully when saving cache", () => {
      const mockError = new Error("Test error");
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      cacheHandler.addToTemporaryCache("cacheKey", "test-value");

      expect(() => cacheHandler.flushTemporaryCache()).not.toThrow();
    });
  });

  describe("addToTemporaryCache", () => {
    it("should add to temporary cache but not to persistent cache", () => {
      mockCache();

      cacheHandler.addToTemporaryCache("cacheKey", "test-value");

      expect(cacheHandler.getFromPersistentCache("cacheKey")).toBeUndefined();
      expect(mockedCacheFile).toBeUndefined();
    });

    it("should store snapshot hashes when provided", () => {
      cacheHandler.addToTemporaryCache("cacheKey", "test-value", mockHashes);
      cacheHandler.flushTemporaryCache();

      const result = cacheHandler.getFromPersistentCache("cacheKey");
      expect(result?.[0].snapshotHashes).toEqual(mockHashes);
    });
  });

  describe("getFromPersistentCache", () => {
    it("should retrieve a value from cache", () => {
      cacheHandler.addToTemporaryCache("some_key", "test-value");
      cacheHandler.flushTemporaryCache();

      const result = cacheHandler.getFromPersistentCache("some_key");

      expect(result?.[0].value).toEqual("test-value");
    });

    it("should return undefined if the key does not exist in cache", () => {
      const result = cacheHandler.getFromPersistentCache("non_existent_key");

      expect(result).toBeUndefined();
    });

    it("should return undefined when cache is disabled", () => {
      cacheHandler = new CacheHandler(mockSnapshotComparator, {
        shouldOverrideCache: true,
      });

      cacheHandler.addToTemporaryCache("some_key", "test-value");
      cacheHandler.flushTemporaryCache();

      const result = cacheHandler.getFromPersistentCache("some_key");
      expect(result).toBeUndefined();
    });
  });

  describe("flushTemporaryCache", () => {
    it("should move all temporary cache entries to the persistent cache", () => {
      expect(cacheHandler.getFromPersistentCache("cacheKey1")).toBeUndefined();

      cacheHandler.addToTemporaryCache("cacheKey1", "value1");
      cacheHandler.addToTemporaryCache("cacheKey2", "value2");

      cacheHandler.flushTemporaryCache();

      const result = cacheHandler.getFromPersistentCache("cacheKey2");
      expect(result?.length).toBe(1);
      expect(result?.[0].value).toEqual("value2");
    });

    it("should append multiple values for the same key", () => {
      expect(cacheHandler.getFromPersistentCache("cacheKey1")).toBeUndefined();

      cacheHandler.addToTemporaryCache("cacheKey1", "value1");
      cacheHandler.addToTemporaryCache("cacheKey1", "value2");

      cacheHandler.flushTemporaryCache();

      const result = cacheHandler.getFromPersistentCache("cacheKey1");
      expect(result?.length).toBe(2);
      expect(result?.[0].value).toEqual("value1");
      expect(result?.[1].value).toEqual("value2");
    });

    it("should do nothing if temporary cache is empty", () => {
      mockCache({});

      cacheHandler.flushTemporaryCache();

      expect(mockedCacheFile).toStrictEqual({});
    });
  });

  describe("clearTemporaryCache", () => {
    it("should clear the temporary cache without persisting it", () => {
      mockCache({});
      cacheHandler.addToTemporaryCache("cacheKey", "test-value");

      expect(cacheHandler.getFromPersistentCache("cacheKey")).toBeUndefined();

      cacheHandler.clearTemporaryCache();
      cacheHandler.flushTemporaryCache();

      expect(cacheHandler.getFromPersistentCache("cacheKey")).toBeUndefined();
      expect(mockedCacheFile).toStrictEqual({});
    });
  });

  describe("generateHashes", () => {
    it("should delegate hash generation to the SnapshotComparator", async () => {
      await cacheHandler.generateHashes(mockScreenCapture);

      expect(mockSnapshotComparator.generateHashes).toHaveBeenCalledWith(
        mockScreenCapture,
      );
    });
  });

  describe("findMatchingCacheEntry", () => {
    it("should return undefined if no cache values are provided", () => {
      const result = cacheHandler.findMatchingCacheEntry([], mockHashes);
      expect(result).toBeUndefined();
    });

    it("should return undefined if no hashes are provided", () => {
      const cacheValues = [
        {
          value: "test-value",
          creationTime: Date.now(),
          lastAccessTime: Date.now(),
          snapshotHashes: mockHashes,
        },
      ];

      const result = cacheHandler.findMatchingCacheEntry(
        cacheValues,
        undefined,
      );
      expect(result).toBeUndefined();
    });

    it("should return matching cache entry when found", () => {
      const cacheValues = [
        {
          value: "test-value",
          creationTime: Date.now(),
          lastAccessTime: Date.now(),
          snapshotHashes: mockHashes,
        },
      ];

      mockSnapshotComparator.compareSnapshot.mockReturnValue(true);

      const result = cacheHandler.findMatchingCacheEntry(
        cacheValues,
        mockHashes,
      );
      expect(result).toBe(cacheValues[0]);
      expect(mockSnapshotComparator.compareSnapshot).toHaveBeenCalledWith(
        mockHashes,
        cacheValues[0].snapshotHashes,
      );
    });

    it("should update lastAccessTime when a match is found", () => {
      const now = Date.now();
      const oldTime = now - 1000;

      const cacheValues = [
        {
          value: "test-value",
          creationTime: oldTime,
          lastAccessTime: oldTime,
          snapshotHashes: mockHashes,
        },
      ];

      mockSnapshotComparator.compareSnapshot.mockReturnValue(true);

      jest.spyOn(Date, "now").mockReturnValue(now);

      const result = cacheHandler.findMatchingCacheEntry(
        cacheValues,
        mockHashes,
      );
      expect(result?.lastAccessTime).toBe(now);
    });
  });

  describe("generateCacheKey", () => {
    it("should return undefined if cache is disabled", () => {
      cacheHandler = new CacheHandler(mockSnapshotComparator, {
        shouldUseCache: false,
      });

      const result = cacheHandler.generateCacheKey({ test: "data" });
      expect(result).toBeUndefined();
    });

    it("should generate a JSON string key from the provided data", () => {
      const keyData = { step: "test-step", previousSteps: ["step1", "step2"] };
      const expected = JSON.stringify(keyData);

      const result = cacheHandler.generateCacheKey(keyData);
      expect(result).toBe(expected);
    });
  });

  describe("isCacheInUse", () => {
    it("should return true by default", () => {
      expect(cacheHandler.isCacheInUse()).toBe(true);
    });

    it("should return false when shouldUseCache is false", () => {
      cacheHandler = new CacheHandler(mockSnapshotComparator, {
        shouldUseCache: false,
      });
      expect(cacheHandler.isCacheInUse()).toBe(false);
    });
  });
});
