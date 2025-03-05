import fs from "fs";
import path from "path";
import { AutoPreviousStep, CacheOptions, PreviousStep } from "@/types";

export class CacheHandler {
  private cache: Map<string, any> = new Map();
  private temporaryCache: Map<string, any> = new Map();
  private readonly cacheFilePath: string;
  private cacheOptions?: CacheOptions;

  constructor(
    cacheOptions: CacheOptions = {},
    cacheFileName: string = "wix_pilot_cache.json",
  ) {
    this.cacheFilePath = path.resolve(process.cwd(), cacheFileName);
    this.cacheOptions = {
      shouldUseCache: cacheOptions.shouldUseCache ?? true,
      shouldOverrideCache: cacheOptions.shouldOverrideCache ?? false,
    };
  }

  public loadCacheFromFile(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, "utf-8");
        const json = JSON.parse(data);
        this.cache = new Map(Object.entries(json));
      } else {
        this.cache.clear(); // Ensure cache is empty if file doesn't exist
      }
    } catch (error) {
      console.warn("Error loading cache from file:", error);
      this.cache.clear(); // Clear cache on error to avoid stale data
    }
  }

  private saveCacheToFile(): void {
    try {
      const json = Object.fromEntries(this.cache);
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(json, null, 2), {
        flag: "w+",
      });
    } catch (error) {
      console.error("Error saving cache to file:", error);
    }
  }

  public getStepFromCache(key: string): any | undefined {
    if (this.shouldOverrideCache()) {
      return undefined;
    }
    return this.cache.get(key);
  }

  public addToTemporaryCache(key: string, value: any): void {
    this.temporaryCache.set(key, [
      ...(this.temporaryCache.get(key) ?? []),
      value,
    ]);
  }

  public flushTemporaryCache(): void {
    this.temporaryCache.forEach((value, key) => {
      this.cache.set(key, value);
    });
    this.saveCacheToFile();
    this.clearTemporaryCache();
  }

  public clearTemporaryCache(): void {
    this.temporaryCache.clear();
  }

  public generateCacheKey(
    currentGoal: string,
    previous: PreviousStep[] | AutoPreviousStep[],
  ): string | undefined {
    if (!this.isCacheInUse()) {
      return undefined;
    }

    const cacheKeyData: any = { currentGoal, previous };

    return JSON.stringify(cacheKeyData);
  }

  private shouldOverrideCache() {
    return this.cacheOptions?.shouldOverrideCache;
  }

  public isCacheInUse() {
    return this.cacheOptions?.shouldUseCache !== false;
  }
}
