import { CacheHandler } from "./CacheHandler";
import { mockCache, mockedCacheFile } from "../../test-utils/cache";
import { SnapshotComparator } from "../snapshot/comparator/SnapshotComparator";
import {
  CacheValueSnapshot,
  CacheValueValidationMatcher,
  ScreenCapturerResult,
} from "@/types";
import fs from "fs";
import * as testEnvUtils from "./testEnvUtils";
import expect from "expect";

jest.mock("fs");
jest.mock("../snapshot/comparator/SnapshotComparator");

describe("CacheHandler", () => {
  let cacheHandler: CacheHandler;
  let mockSnapshotComparator: jest.Mocked<SnapshotComparator>;

  const CACHED_VALUE = {
    value: { code: "code to run" },
    validationMatcher: "validation code",
    creationTime: Date.now(),
  };

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

    // Mock the getCurrentJestTestFilePath to return undefined by default
    jest
      .spyOn(testEnvUtils, "getCurrentTestFilePath")
      .mockReturnValue(undefined);

    cacheHandler = new CacheHandler(
      mockSnapshotComparator as unknown as SnapshotComparator,
    );
  });

  describe("cache and file operations", () => {
    it("should load cache from file successfully if the file exists and is valid - matcher based", async () => {
      mockCache({ cacheKey: [CACHED_VALUE] });

      expect(
        await cacheHandler.getFromPersistentCache("cacheKey"),
      ).toBeUndefined();

      await cacheHandler.loadCacheFromFile();

      const result = await cacheHandler.getFromPersistentCache("cacheKey");
      expect(result).toEqual([CACHED_VALUE]);
    });

    it("should save cache to file successfully", async () => {
      mockCache();

      await cacheHandler.addToTemporaryCacheValidationMatcherBased(
        "cacheKey",
        CACHED_VALUE.value,
        CACHED_VALUE.validationMatcher,
      );
      await cacheHandler.flushTemporaryCache();

      expect(mockedCacheFile).toHaveProperty("cacheKey");
      expect(mockedCacheFile?.cacheKey[0].value).toEqual({
        code: "code to run",
      });
      expect(mockedCacheFile?.cacheKey[0].validationMatcher).toEqual(
        "validation code",
      );
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

      cacheHandler.addToTemporaryCacheValidationMatcherBased(
        "cacheKey",
        CACHED_VALUE.value,
        CACHED_VALUE.validationMatcher,
      );

      expect(() => cacheHandler.flushTemporaryCache()).not.toThrow();
    });
  });

  describe("addToTemporaryCache", () => {
    it("should add to temporary cache but not to persistent cache", async () => {
      mockCache();

      await cacheHandler.addToTemporaryCacheValidationMatcherBased(
        "cacheKey",
        CACHED_VALUE.value,
        CACHED_VALUE.validationMatcher,
      );

      expect(
        await cacheHandler.getFromPersistentCache("cacheKey"),
      ).toBeUndefined();
      expect(mockedCacheFile).toBeUndefined();
    });

    it("should store snapshot hashes when provided", async () => {
      await cacheHandler.addToTemporaryCacheSnapshotBased(
        "cacheKey",
        "test-value",
        mockHashes,
      );
      await cacheHandler.flushTemporaryCache();

      const result = (await cacheHandler.getFromPersistentCache(
        "cacheKey",
      )) as CacheValueSnapshot<string>[];
      expect(result?.[0].snapshotHashes).toEqual(mockHashes);
    });
  });

  describe("getFromPersistentCache", () => {
    it("should retrieve a value from cache", async () => {
      await cacheHandler.addToTemporaryCacheValidationMatcherBased(
        "some_key",
        CACHED_VALUE.value,
        CACHED_VALUE.validationMatcher,
      );
      await cacheHandler.flushTemporaryCache();

      const result = await cacheHandler.getFromPersistentCache("some_key");

      expect(result?.[0].value).toEqual({ code: "code to run" });
    });

    it("should return undefined if the key does not exist in cache", async () => {
      const result =
        await cacheHandler.getFromPersistentCache("non_existent_key");

      expect(result).toBeUndefined();
    });

    it("should return undefined when cache is disabled", async () => {
      cacheHandler = new CacheHandler(mockSnapshotComparator, {
        shouldOverrideCache: true,
      });

      await cacheHandler.addToTemporaryCacheValidationMatcherBased(
        "some_key",
        CACHED_VALUE.value,
        CACHED_VALUE.validationMatcher,
      );
      await cacheHandler.flushTemporaryCache();

      const result = await cacheHandler.getFromPersistentCache("some_key");
      expect(result).toBeUndefined();
    });
  });

  describe("flushTemporaryCache", () => {
    it("should move all temporary cache entries to the persistent cache", async () => {
      expect(
        await cacheHandler.getFromPersistentCache("cacheKey1"),
      ).toBeUndefined();

      await cacheHandler.addToTemporaryCacheValidationMatcherBased(
        "cacheKey1",
        { code: "code to run 1" },
        "validation code 1",
      );
      await cacheHandler.addToTemporaryCacheValidationMatcherBased(
        "cacheKey2",
        { code: "code to run 2" },
        "validation code 2",
      );

      await cacheHandler.flushTemporaryCache();

      const result = await cacheHandler.getFromPersistentCache("cacheKey2");
      expect(result?.length).toBe(1);
      expect(result?.[0].value).toEqual({ code: "code to run 2" });
    });

    it("should append multiple values for the same key", async () => {
      expect(
        await cacheHandler.getFromPersistentCache("cacheKey1"),
      ).toBeUndefined();

      await cacheHandler.addToTemporaryCacheValidationMatcherBased(
        "cacheKey1",
        { code: "code to run 1" },
        "validation code 1",
      );
      await cacheHandler.addToTemporaryCacheValidationMatcherBased(
        "cacheKey1",
        { code: "code to run 2" },
        "validation code 2",
      );

      await cacheHandler.flushTemporaryCache();

      const result = (await cacheHandler.getFromPersistentCache(
        "cacheKey1",
      )) as CacheValueValidationMatcher<string>[];
      expect(result?.length).toBe(2);
      expect(result?.[0].value).toEqual({ code: "code to run 1" });
      expect(result?.[1].value).toEqual({ code: "code to run 2" });
      expect(result?.[0].validationMatcher).toEqual("validation code 1");
      expect(result?.[1].validationMatcher).toEqual("validation code 2");
    });

    it("should do nothing if temporary cache is empty", () => {
      mockCache({});

      cacheHandler.flushTemporaryCache();

      expect(mockedCacheFile).toStrictEqual({});
    });
  });

  describe("clearTemporaryCache", () => {
    it("should clear the temporary cache without persisting it", async () => {
      mockCache({});
      await cacheHandler.addToTemporaryCacheValidationMatcherBased(
        "cacheKey",
        CACHED_VALUE.value,
        CACHED_VALUE.validationMatcher,
      );

      expect(
        await cacheHandler.getFromPersistentCache("cacheKey"),
      ).toBeUndefined();

      cacheHandler.clearTemporaryCache();
      await cacheHandler.flushTemporaryCache();

      expect(
        await cacheHandler.getFromPersistentCache("cacheKey"),
      ).toBeUndefined();
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
      const result = cacheHandler.findMatchingCacheEntrySnapshotBased(
        [],
        mockHashes,
      );
      expect(result).toBeUndefined();
    });

    it("should return undefined if no hashes are provided", async () => {
      const result =
        await cacheHandler.findMatchingCacheEntryValidationMatcherBased(
          [CACHED_VALUE],
          undefined,
        );

      expect(result).toBeUndefined();
    });

    it("should return matching cache entry when found", () => {
      const cacheValues = [
        {
          value: "test-value",
          creationTime: Date.now(),
          snapshotHashes: mockHashes,
        },
      ];

      mockSnapshotComparator.compareSnapshot.mockReturnValue(true);

      const result = cacheHandler.findMatchingCacheEntrySnapshotBased(
        cacheValues,
        mockHashes,
      );

      expect(result).toBe(cacheValues[0]);
      expect(mockSnapshotComparator.compareSnapshot).toHaveBeenCalledWith(
        mockHashes,
        cacheValues[0].snapshotHashes,
      );
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

  describe("cache file path handling", () => {
    beforeEach(() => {
      jest.spyOn(testEnvUtils, "getCurrentTestFilePath").mockReset();
    });

    it("should use default cache path when no Jest test path is available", async () => {
      jest
        .spyOn(testEnvUtils, "getCurrentTestFilePath")
        .mockReturnValue(undefined);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const newCacheHandler = new CacheHandler(mockSnapshotComparator);

      const cacheFilePath = await (newCacheHandler as any).cacheFilePath;
      expect(cacheFilePath).toContain("__pilot_cache__/global.json");
    });

    it("should use Jest test file path when available", async () => {
      const mockTestPath = "/path/to/test/myTest.test.ts";
      jest
        .spyOn(testEnvUtils, "getCurrentTestFilePath")
        .mockReturnValue(mockTestPath);

      const newCacheHandler = new CacheHandler(mockSnapshotComparator);

      const cacheFilePath = await (newCacheHandler as any).cacheFilePath;
      expect(cacheFilePath).toContain(
        "/path/to/test/__pilot_cache__/myTest.test.json",
      );
    });

    it("should use explicit cache file path when provided", async () => {
      const explicitPath = "/custom/path/cache.json";

      const newCacheHandler = new CacheHandler(
        mockSnapshotComparator,
        {},
        explicitPath,
      );

      const cacheFilePath = await (newCacheHandler as any).cacheFilePath;
      expect(cacheFilePath).toContain("/custom/path/cache.json");
    });
  });
});
