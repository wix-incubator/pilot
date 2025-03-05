import { CacheHandler } from "./CacheHandler";
import { mockCache, mockedCacheFile } from "../../test-utils/cache";

jest.mock("fs");

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
});
