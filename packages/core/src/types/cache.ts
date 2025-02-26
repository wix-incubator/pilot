import { AutoReview, AutoStepPlan } from "@/types/auto";

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
export type HashingAlgorithm = "BlockHash";

/** Hash algorithm output format */
export type SnapshotHashObject = Record<HashingAlgorithm, string>;

/**
 * Single cache entry.
 */
export type SingleCacheValue = {
  /** UI snapshot hash */
  snapshotHash?: SnapshotHashObject;
  /** Component hierarchy */
  viewHierarchy?: string;
  /** Generated code */
  code: string;
};

/**
 * Single auto pilot cache entry.
 */
export type SingleAutoPilotCacheValue = {
  /** Screen capture output */
  screenCapture: ScreenCapturerResult;
  /** UI snapshot hash */
  snapshotHash?: SnapshotHashObject;
  /** Screen description */
  screenDescription: string;
  /** Auto pilot step plan */
  plan: AutoStepPlan;
  /** Auto pilot step review */
  review: AutoReview;
  /** Goal achievement status */
  goalAchieved: boolean;
  /** Summary*/
  summary?: string;
};

/** Cache entry array */
export type CacheValues = SingleCacheValue[];

/** Auto pilot cache entry array */
export type CacheAutoPilotValues = SingleAutoPilotCacheValue[];

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
   * Calculates difference between snapshot hashes.
   * @param hash1 - First snapshot hash
   * @param hash2 - Second snapshot hash
   * @returns Numerical difference
   */
  calculateSnapshotDistance(hash1: string, hash2: string): number;

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
