import fs from "fs";
import path from "path";
import os from "os";
import {
  CacheOptions,
  CacheValue,
  CacheValueSnapshot,
  CacheValueViewHierarchy,
  ScreenCapturerResult,
  SnapshotHashes,
} from "@/types";
import { SnapshotComparator } from "../snapshot/comparator/SnapshotComparator";
import logger from "@/common/logger";
import { getCurrentTestFilePath } from "./testEnvUtils";

/**
 * CacheHandler provides a unified caching solution for both StepPerformer and AutoPerformer.
 * It works with the SnapshotComparator to compare snapshots and find matching cache entries.
 */
export class CacheHandler {
  private static CACHE_DIRECTORY = "__pilot_cache__";
  private static DEFAULT_CACHE_FILENAME = "global.json";
  private static APP_NAME = "PilotAutomation";

  private cache: Map<string, Array<CacheValue<unknown>>> = new Map();
  private temporaryCache: Map<string, Array<CacheValue<unknown>>> = new Map();
  private readonly overrideCacheFilePath: string | undefined;
  private cacheFilePath: string;
  private cacheOptions?: CacheOptions;
  private snapshotComparator: SnapshotComparator;

  /**
   * Creates a new CacheHandler instance
   * @param snapshotComparator The snapshot comparator to use for hash generation and comparison
   * @param cacheOptions Cache configuration options
   * @param cacheFilePath Optional explicit cache file path override
   */
  constructor(
    snapshotComparator: SnapshotComparator,
    cacheOptions: CacheOptions = {},
    cacheFilePath?: string,
  ) {
    this.overrideCacheFilePath = cacheFilePath;
    this.cacheOptions = this.createCacheOptionsWithDefaults(cacheOptions);
    this.snapshotComparator = snapshotComparator;
    this.cacheFilePath = this.determineCurrentCacheFilePath();
  }

  private createCacheOptionsWithDefaults(
    cacheOptions: CacheOptions,
  ): CacheOptions {
    return {
      shouldUseCache: cacheOptions.shouldUseCache ?? true,
      shouldOverrideCache: cacheOptions.shouldOverrideCache ?? false,
    };
  }

  private determineCurrentCacheFilePath() {
    return this.overrideCacheFilePath || this.getCacheFilePath();
  }

  /**
   * Generate hashes for a snapshot using all registered algorithms
   * @param screenCapture The screen capture result
   * @returns Object with hash values from each registered algorithm
   */
  public async generateHashes(
    screenCapture: ScreenCapturerResult,
  ): Promise<SnapshotHashes> {
    return await this.snapshotComparator.generateHashes(screenCapture);
  }

  public loadCacheFromFile(): void {
    this.cacheFilePath = this.determineCurrentCacheFilePath();

    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, "utf-8");
        const json = JSON.parse(data);
        this.cache = new Map(Object.entries(json));
      } else {
        this.cache.clear();
      }
    } catch (error) {
      logger.warn("Error loading cache from file:", {
        message: String(error),
        color: "yellow",
      });
      this.cache.clear();
    }
  }

  private saveCacheToFile(): void {
    try {
      const dirPath = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const json = Object.fromEntries(this.cache);
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(json, null, 2), {
        flag: "w+",
      });
      logger.info("Pilot cache saved successfully");
    } catch (error) {
      logger.error("Error saving cache to file:", {
        message: String(error),
        color: "red",
      });
    }
  }

  /**
   * Get cached values by key from the persistent cache
   * @param cacheKey The cache key string
   * @returns Array of cache values if found, undefined otherwise
   */
  public getFromPersistentCache<T>(
    cacheKey: string,
  ): Array<CacheValue<T>> | undefined {
    if (this.shouldOverrideCache()) {
      logger.info("Cache disabled, generating new response");
      return undefined;
    }

    return this.cache.get(cacheKey) as Array<CacheValue<T>> | undefined;
  }

  /**
   * Add value to temporary cache
   * @param cacheKey The cache key string
   * @param value The value to cache
   * @param snapshotHashes Hash values for the current snapshot
   */
  public addToTemporaryCacheSnapshotBased<T>(
    cacheKey: string,
    value: T,
    snapshotHashes?: Partial<SnapshotHashes>,
  ): void {
    logger.info("Saving result to cache for future use");

    const cacheValue: CacheValueSnapshot<T> = {
      value,
      snapshotHashes: snapshotHashes || {},
      creationTime: Date.now(),
    };

    const existingValues = this.temporaryCache.get(cacheKey) || [];
    this.temporaryCache.set(cacheKey, [
      ...existingValues,
      cacheValue as CacheValue<unknown>,
    ]);
  }

  /**
   * Add value to temporary cache
   * @param cacheKey The cache key string
   * @param value The value to cache
   * @param viewHierarchy The relevant snipped from the view hierarchy string
   */
  public addToTemporaryCacheViewHierarchyBased<T>(
    cacheKey: string,
    value: T,
    viewHierarchy: string[],
  ): void {
    logger.labeled("CACHE").info("Saving response to cache");

    const cacheValue: CacheValueViewHierarchy<T> = {
      value,
      viewHierarchy,
      creationTime: Date.now(),
    };

    const existingValues = this.temporaryCache.get(cacheKey) || [];
    this.temporaryCache.set(cacheKey, [
      ...existingValues,
      cacheValue as CacheValue<unknown>,
    ]);
  }

  /**
   * Persist temporary cache to permanent cache and save to file
   */
  public flushTemporaryCache(): void {
    this.temporaryCache.forEach((values, key) => {
      const existingValues = this.cache.get(key) || [];
      this.cache.set(key, [...existingValues, ...values]);
    });

    this.saveCacheToFile();
    this.clearTemporaryCache();
  }

  /**
   * Clear the temporary cache without persisting it
   */
  public clearTemporaryCache(): void {
    this.temporaryCache.clear();
  }

  /**
   * Find matching cache entry by comparing snapshot hashes
   * @param cacheValues Array of cache values to search
   * @param currentHashes Current snapshot hashes (complete with all algorithms)
   * @returns Matching cache value if found, undefined otherwise
   */
  public findMatchingCacheEntrySnapshotBased<T>(
    cacheValues: Array<CacheValueSnapshot<T>>,
    currentHashes?: SnapshotHashes,
  ): CacheValue<T> | undefined {
    if (!cacheValues?.length || !currentHashes) {
      return undefined;
    }

    return cacheValues.find((entry) => {
      return this.snapshotComparator.compareSnapshot(
        currentHashes,
        entry.snapshotHashes,
      );
    });
  }

  /**
   * Find matching cache entry by comparing snapshot hashes
   * @param cacheValues Array of cache values to search
   * @param viewHierarchy The view hierarchy string to match
   * @returns Matching cache value if found, undefined otherwise
   */
  public findMatchingCacheEntryViewHierarchyBased<T>(
    cacheValues: Array<CacheValueViewHierarchy<T>>,
    viewHierarchy: string | undefined,
  ): CacheValue<T> | undefined {
    if (!cacheValues?.length || !viewHierarchy) {
      return undefined;
    }

    for (const entry of cacheValues) {
      if (!entry.viewHierarchy) continue;

      let allMatch = true;

      for (const hierarchy of entry.viewHierarchy) {
        if (!viewHierarchy.includes(hierarchy)) {
          allMatch = false;
          break;
        }
      }

      if (allMatch) {
        return entry;
      }
    }

    return undefined;
  }

  /**
   * Generate a cache key from serializable data
   * @param keyData The data to use as a cache key (must be JSON serializable)
   * @returns Cache key string or undefined if cache is disabled
   * @example
   * // Generate a key for step performer
   * const key = cacheHandler.generateCacheKey({ step, previousSteps });
   *
   * // Generate a key for auto performer
   * const key = cacheHandler.generateCacheKey({ goal, previousSteps });
   */
  public generateCacheKey<T>(keyData: T): string | undefined {
    if (!this.isCacheInUse()) {
      return undefined;
    }

    return JSON.stringify(keyData);
  }

  private shouldOverrideCache() {
    return this.cacheOptions?.shouldOverrideCache;
  }

  public isCacheInUse() {
    return this.cacheOptions?.shouldUseCache !== false;
  }

  /**
   * Gets the OS-specific user data directory path for the application
   * @returns The appropriate application data directory for the current OS
   */
  private getUserDataDir(): string {
    const platform = process.platform;
    const appName = CacheHandler.APP_NAME;

    switch (platform) {
      case "darwin":
        return path.join(
          os.homedir(),
          "Library",
          "Application Support",
          appName,
        );
      case "win32":
        return process.env.APPDATA
          ? path.join(process.env.APPDATA, appName)
          : path.join(os.homedir(), "AppData", "Roaming", appName);
      case "linux":
        return path.join(os.homedir(), ".config", appName);
      default:
        return path.join(os.homedir(), ".local", "share", appName);
    }
  }

  /**
   * Determines the appropriate cache file path based on the caller path
   * @returns The resolved cache file path
   */
  private getCacheFilePath(): string {
    const callerPath = getCurrentTestFilePath();

    return callerPath
      ? this.getCallerCacheFilePath(callerPath)
      : this.getDefaultCacheFilePath();
  }

  /**
   * Gets the cache file path for a specific caller file (typically a Jest test)
   * @param callerPath The path of the calling file
   * @returns The resolved cache file path specific to the caller
   */
  private getCallerCacheFilePath(callerPath: string): string {
    const testDir = path.dirname(callerPath);
    const testFilename = path.basename(callerPath, path.extname(callerPath));
    return path.join(
      testDir,
      CacheHandler.CACHE_DIRECTORY,
      `${testFilename}.json`,
    );
  }

  /**
   * Gets the default global cache file path when no caller path is available
   * @returns The resolved default cache file path
   */
  private getDefaultCacheFilePath(): string {
    return path.join(
      this.getUserDataDir(),
      CacheHandler.CACHE_DIRECTORY,
      CacheHandler.DEFAULT_CACHE_FILENAME,
    );
  }
}
