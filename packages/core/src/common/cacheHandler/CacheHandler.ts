import { CacheOptions } from "@/types";
import { AtomicOperationQueue } from "./atomicFileOperations";
import {
  ensureDirectoryExists,
  readJsonFile,
  writeJsonFile,
} from "./fileSystem";
import path from "path";
import * as crypto from "crypto";
import { SnapshotComparator } from "../snapshot/comparator/SnapshotComparator";
import { SnapshotData, SnapshotHashObject } from "@/types/cache";

/**
 * Manages caching operations for performers, with file persistence and hash-based lookups
 */
export class CacheHandler {
  private static readonly CACHE_DIRECTORY = "__pilot_cache__";
  private static readonly DEFAULT_CACHE_FILENAME = "global.json";

  private cache = new Map<string, unknown[]>();
  private tempCache = new Map<string, unknown[]>();
  private fileOperationQueue = new AtomicOperationQueue();
  private callerFilePath?: string;
  private readonly options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      shouldUseCache: options.shouldUseCache ?? true,
      shouldOverrideCache: options.shouldOverrideCache ?? false,
    };

    this.loadCacheFromFile();
  }

  public setCallerFilePath(callerPath: string): void {
    if (!callerPath) {
      throw new Error("Cannot set empty test file path");
    }

    this.callerFilePath = path.resolve(callerPath);
    this.loadCacheFromFile();
  }

  public loadCacheFromFile(): void {
    const cacheFilePath = this.getCacheFilePath();
    ensureDirectoryExists(path.dirname(cacheFilePath));

    const fileData = readJsonFile<Record<string, unknown[]>>(cacheFilePath);
    this.cache = fileData ? new Map(Object.entries(fileData)) : new Map();
  }

  public getStepFromCache(key: string): unknown[] | undefined {
    if (this.options.shouldOverrideCache) {
      return undefined;
    }
    return this.cache.get(key);
  }

  public addToTemporaryCache(key: string, value: unknown): void {
    const existingValues = this.tempCache.get(key) ?? [];
    this.tempCache.set(key, [...existingValues, value]);
  }

  public flushTemporaryCache(): void {
    for (const [key, values] of this.tempCache.entries()) {
      const existingValues = this.cache.get(key) ?? [];
      this.cache.set(key, [...existingValues, ...values]);
    }

    this.saveCacheToFile();
    this.clearTemporaryCache();
  }

  public clearTemporaryCache(): void {
    this.tempCache.clear();
  }

  public getCallerFilePath(): string | undefined {
    return this.callerFilePath;
  }

  public isCacheInUse(): boolean {
    return this.options.shouldUseCache;
  }

  private getCacheFilePath(): string {
    return this.callerFilePath
      ? this.getCallerCacheFilePath()
      : this.getDefaultCacheFilePath();
  }

  private getCallerCacheFilePath(): string {
    if (!this.callerFilePath) {
      return this.getDefaultCacheFilePath();
    }

    const callerDir = path.dirname(this.callerFilePath);
    const fileName = path.basename(
      this.callerFilePath,
      path.extname(this.callerFilePath),
    );

    return path.join(
      callerDir,
      CacheHandler.CACHE_DIRECTORY,
      `${fileName}.json`,
    );
  }

  private getDefaultCacheFilePath(): string {
    return path.resolve(
      process.cwd(),
      CacheHandler.CACHE_DIRECTORY,
      CacheHandler.DEFAULT_CACHE_FILENAME,
    );
  }

  private saveCacheToFile(): void {
    this.fileOperationQueue.execute(() => {
      const cacheFilePath = this.getCacheFilePath();
      const jsonData = Object.fromEntries(this.cache);
      writeJsonFile(cacheFilePath, jsonData);
    });
  }

  /**
   * Generates a standardized cache key
   */
  public generateCacheKey<T>(
    identifier: string,
    previous: T[],
    options: {
      keyName: string;
      previousKeyName: string;
      mapFn: (item: T) => any;
    },
  ): string | undefined {
    if (!this.isCacheInUse()) {
      return undefined;
    }

    const cacheKeyData = {
      [options.keyName]: identifier,
      [options.previousKeyName]: previous.map(options.mapFn),
    };

    return JSON.stringify(cacheKeyData);
  }

  public hashViewHierarchy(viewHierarchy: string): string {
    return crypto.createHash("md5").update(viewHierarchy).digest("hex");
  }

  public async generateSnapshotHash(
    snapshot: string | undefined,
    comparator: SnapshotComparator,
  ): Promise<SnapshotHashObject | undefined> {
    return snapshot ? comparator.generateHashes(snapshot) : undefined;
  }

  public async generateCacheHashes(
    viewHierarchy: string,
    snapshot: string | undefined,
    comparator: SnapshotComparator,
  ): Promise<{
    viewHierarchyHash: string;
    snapshotHash?: SnapshotHashObject;
  }> {
    return {
      viewHierarchyHash: this.hashViewHierarchy(viewHierarchy),
      snapshotHash: await this.generateSnapshotHash(snapshot, comparator),
    };
  }

  /**
   * Finds matching cache entry by comparing snapshots or view hierarchy hashes
   */
  public async findInCache<T extends SnapshotData>(
    cachedValues: T[],
    viewHierarchy: string,
    snapshot: string | undefined,
    comparator: SnapshotComparator,
  ): Promise<T | undefined> {
    if (snapshot) {
      const snapshotHash = await this.generateSnapshotHash(
        snapshot,
        comparator,
      );

      const matchedBySnapshot = cachedValues.find(
        (cachedValue) =>
          cachedValue.snapshotHash &&
          snapshotHash &&
          comparator.compareSnapshot(snapshotHash, cachedValue.snapshotHash),
      );

      if (matchedBySnapshot) {
        return matchedBySnapshot;
      }
    }

    const viewHierarchyHash = this.hashViewHierarchy(viewHierarchy);
    const matchedByViewHierarchy = cachedValues.find(
      (cachedValue) => cachedValue.viewHierarchyHash === viewHierarchyHash,
    );

    if (matchedByViewHierarchy) {
      return matchedByViewHierarchy;
    }

    return undefined;
  }
}
