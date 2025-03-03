import { CacheHandler } from "./CacheHandler";
import { mockCache, mockedCacheFile } from "../../test-utils/cache";
import path from "path";

jest.mock("fs");
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  resolve: jest.fn((p) => p),
  join: jest.fn((...args) => args.join("/")),
  dirname: jest.fn((p) => p.substring(0, p.lastIndexOf("/"))),
  basename: jest.fn((p) => p.substring(p.lastIndexOf("/") + 1)),
}));

describe("CacheHandler", () => {
  let cacheHandler: CacheHandler;
  const mockTestFilePath = "/path/to/test/file.test.ts";

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

  describe("cache file finding", () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it("should throw error when basePath is not provided", () => {
      const handler = new CacheHandler();
      expect(() => {
        handler.findCacheFiles("");
      }).toThrow("Base path must be provided");
    });

    it("should return empty array when no cache files are found", () => {
      jest.doMock("glob", () => ({
        sync: jest.fn().mockReturnValue([]),
      }));

      const handler = new CacheHandler();
      const files = handler.findCacheFiles("/some/path");
      expect(files).toEqual([]);
    });

    it("should handle errors when finding cache files", () => {
      jest.doMock("glob", () => ({
        sync: jest.fn().mockImplementation(() => {
          throw new Error("Some glob error");
        }),
      }));

      const handler = new CacheHandler();
      const files = handler.findCacheFiles("/some/path");
      expect(files).toEqual([]);
    });
  });

  describe("contextual cache", () => {
    beforeEach(() => {
      (path.resolve as jest.Mock).mockImplementation((p) => p);
    });

    it("should use test file path from constructor", () => {
      const handler = new CacheHandler({}, mockTestFilePath);
      expect(handler.getTestFilePath()).toBe(mockTestFilePath);
      expect(path.resolve).toHaveBeenCalledWith(mockTestFilePath);
    });

    it("should update test file path", () => {
      const handler = new CacheHandler();
      expect(handler.getTestFilePath()).toBeUndefined();

      const newPath = "/new/path/file.test.ts";
      handler.setCallerFilePath(newPath);
      expect(handler.getTestFilePath()).toBe(newPath);
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
