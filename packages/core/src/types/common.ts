/**
 * Screen capture output.
 */
export type ScreenCapturerResult = {
  /** UI snapshot path */
  snapshot?: string;
  /** Component hierarchy */
  viewHierarchy?: string;
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
   * @param screenCapture - Screen capture output to hash
   * @returns Hash string or undefined if no relevant data
   */
  hashSnapshot(
    screenCapture: ScreenCapturerResult,
  ): Promise<string | undefined>;

  /**
   * Checks if snapshots are similar enough according to algorithm-specific criteria.
   * Each algorithm implementation determines its own similarity metrics internally.
   * @param hash1 - First snapshot hash
   * @param hash2 - Second snapshot hash
   * @returns true if similar, false otherwise
   */
  areSnapshotsSimilar(hash1: string, hash2: string): boolean;
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
 */
export type CacheValue<T> = {
  value: T;
  snapshotHashes?: Partial<SnapshotHashes>;
  creationTime: number;
};
