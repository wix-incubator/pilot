import { AutoPreviousStep, CacheOptions, PreviousStep } from "@/types";
import { AtomicOperationQueue } from "./atomicFileOperations";
import { ensureDirectoryExists, readJsonFile, writeJsonFile } from "./fileSystem";
import path from "path";

export class CacheHandler {
  private cache: Map<string, unknown[]> = new Map();
  private temporaryCache: Map<string, unknown[]> = new Map();
  private cacheFilePath: string;
  private cacheOptions: CacheOptions;
  private callerFilePath?: string;
  private fileOperationQueue = new AtomicOperationQueue();

  private static CACHE_DIRECTORY = "__pilot_cache__";
  private static DEFAULT_CACHE_FILENAME = "global.json";

  constructor(cacheOptions: CacheOptions = {}, testFilePath?: string) {
    if (testFilePath) {
      this.callerFilePath = path.resolve(testFilePath); // Ensure absolute path
    }

    this.cacheOptions = {
      shouldUseCache: cacheOptions.shouldUseCache ?? true,
      shouldOverrideCache: cacheOptions.shouldOverrideCache ?? false,
    };

    this.cacheFilePath = this.getCacheFilePath();
  }

  private getCacheFilePath(): string {
    if (this.callerFilePath) {
      const testDir = path.dirname(this.callerFilePath);
      const testFilename = path.basename(
        this.callerFilePath,
        path.extname(this.callerFilePath)
      );
      return path.join(
        testDir,
        CacheHandler.CACHE_DIRECTORY,
        `${testFilename}.json`
      );
    }

    // Fall back to global cache only when no context is available
    return path.resolve(
      process.cwd(),
      CacheHandler.CACHE_DIRECTORY,
      CacheHandler.DEFAULT_CACHE_FILENAME
    );
  }

  public setCallerFilePath(callerPath: string): void {
    if (!callerPath) {
      throw new Error("Cannot set empty test file path");
    }

    this.callerFilePath = path.resolve(callerPath);
    this.cacheFilePath = this.getCacheFilePath();

    this.loadCacheFromFile();
  }

  public loadCacheFromFile(): void {
    this.cacheFilePath = this.getCacheFilePath();

    const cacheDir = path.dirname(this.cacheFilePath);
    ensureDirectoryExists(cacheDir);

    const fileData = readJsonFile<Record<string, unknown[]>>(this.cacheFilePath);

    if (fileData) {
      this.cache = new Map(Object.entries(fileData));
    } else {
      this.cache.clear();
    }
  }

  private saveCacheToFile(): void {
    this.fileOperationQueue.execute(() => {
      this.cacheFilePath = this.getCacheFilePath();
      
      // Simply write the current in-memory cache to file
      // without re-reading and merging with existing file content
      const jsonData = Object.fromEntries(this.cache);
      writeJsonFile(this.cacheFilePath, jsonData);
    });
  }

  public getStepFromCache(key: string): any | undefined {
    if (this.shouldOverrideCache()) {
      return undefined;
    }
    return this.cache.get(key);
  }

  public addToTemporaryCache(key: string, value: any): void {
    const existingValues = this.temporaryCache.get(key) ?? [];
    this.temporaryCache.set(key, [...existingValues, value]);
  }

  public flushTemporaryCache(): void {
    const tempCacheSnapshot = new Map(this.temporaryCache);

    tempCacheSnapshot.forEach((value, key) => {
      const existingValues = this.cache.get(key) ?? [];
      this.cache.set(key, [...existingValues, ...value]);
    });

    this.saveCacheToFile();
    this.clearTemporaryCache();
  }

  public clearTemporaryCache(): void {
    this.temporaryCache.clear();
  }

  public getTestFilePath(): string | undefined {
    return this.callerFilePath;
  }

  public findCacheFiles(basePath: string): string[] {
    if (!basePath) {
      throw new Error("Base path must be provided");
    }

    try {
      const glob = require("glob");
      return glob.sync(`${basePath}/**/${CacheHandler.CACHE_DIRECTORY}/*.json`);
    } catch (error) {
      console.warn("Error finding cache files:", error);
      return [];
    }
  }

  public isCacheInUse(): boolean {
    return this.cacheOptions?.shouldUseCache !== false;
  }

  private shouldOverrideCache(): boolean {
    return !!this.cacheOptions?.shouldOverrideCache;
  }
}
