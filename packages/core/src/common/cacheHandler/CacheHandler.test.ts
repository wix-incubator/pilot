import { CacheHandler } from "./CacheHandler";
import { mockCache, mockedCacheFile } from "../../test-utils/cache";
import path from "path";
import { SnapshotComparator } from "../snapshot/comparator/SnapshotComparator";
import { SnapshotHashObject } from "@/types/cache";

jest.mock("fs");
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

  beforeEach(() => {
    jest.resetAllMocks();
    cacheHandler = new CacheHandler();
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
});
