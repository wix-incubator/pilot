/**
 * Screen capture output.
 */
export type ScreenCapturerResult = {
  /** UI snapshot path */
  snapshot: string | undefined;
  /** Component hierarchy */
  viewHierarchy: string;
  /** Image capture support status */
  isSnapshotImageAttached: boolean;
};

/** Snapshot hashing algorithm types */
export type HashingAlgorithm = "BlockHash" | "ViewHierarchyHash";

/** Hash algorithms output format */
export type SnapshotHashes = Record<HashingAlgorithm, string>;

/**
 * Snapshot hashing operations interface.
 */
export interface SnapshotHashing {
  /**
   * Generates hash from UI snapshot.
   * @param snapshot - UI snapshot to hash
   * @returns Hash string
   */
  hashSnapshot(snapshot: any): Promise<string>;

  /**
   * Checks if snapshots are similar enough.
   * @param hash1 - First snapshot hash
   * @param hash2 - Second snapshot hash
   * @param threshold - Optional similarity threshold
   * @returns true if similar, false otherwise
   */
  areSnapshotsSimilar(
    hash1: string,
    hash2: string,
    threshold?: number,
  ): boolean;
}

/**
 * Cache key structure, serving as a cache key for both StepPerformer and AutoPerformer.
 * @param T - Cached step data type (input).
 */
export type CacheKey<T> = {
  key: T;
};

/**
 * Cache value structure, serving as a cache value for both StepPerformer and AutoPerformer.
 * @param T - Cached step data type (result).
 * @param SnapshotHashes - Snapshot hashes. Allows partial object for backward compatibility.
 * @param creationTime - Cache entry creation time.
 * @param lastAccessTime - Cache entry last access time.
 */
export type CacheValue<T> = {
  value: T;
  snapshotHashes: Partial<SnapshotHashes>;
  creationTime: number;
  lastAccessTime: number;
};
