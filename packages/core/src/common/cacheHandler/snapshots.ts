import * as crypto from "crypto";
import { SnapshotComparator } from "../snapshot/comparator/SnapshotComparator";
import { CacheValues, SingleAutoPilotCacheValue, SnapshotHashObject } from "@/types/cache";

export function hashViewHierarchy(viewHierarchy: string): string {
  return crypto
    .createHash("md5")
    .update(viewHierarchy)
    .digest("hex");
}

export async function generateSnapshotHash(
  snapshot: string | undefined,
  comparator: SnapshotComparator
): Promise<SnapshotHashObject | undefined> {
  if (!snapshot) {
    return undefined;
  }
  
  return await comparator.generateHashes(snapshot);
}

export function compareViewHierarchyHashes(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}

export async function generateCacheHashes(
  viewHierarchy: string,
  snapshot: string | undefined,
  comparator: SnapshotComparator
): Promise<{
  viewHierarchyHash: string;
  snapshotHash?: SnapshotHashObject;
}> {
  return {
    viewHierarchyHash: hashViewHierarchy(viewHierarchy),
    snapshotHash: await generateSnapshotHash(snapshot, comparator)
  };
}

export async function findCodeInCacheValues(
  cacheValue: CacheValues,
  viewHierarchy: string,
  snapshot: string | undefined,
  comparator: SnapshotComparator
): Promise<string | undefined> {
  if (snapshot) {
    const snapshotHash = await generateSnapshotHash(snapshot, comparator);

    const matchedBySnapshot = cacheValue.find((cachedValue) => 
      cachedValue.snapshotHash &&
      snapshotHash &&
      comparator.compareSnapshot(snapshotHash, cachedValue.snapshotHash)
    );

    if (matchedBySnapshot) {
      return matchedBySnapshot.code;
    }
  }

  if (cacheValue.length > 0 && cacheValue[0].code) {
    return cacheValue[0].code;
  }

  if (viewHierarchy) {
    const viewHierarchyHash = hashViewHierarchy(viewHierarchy);
    return cacheValue.find(cachedValue => 
      cachedValue.viewHierarchyHash === viewHierarchyHash
    )?.code;
  }
  
  return undefined;
}

export async function findInCachedValues(
  cachedValues: SingleAutoPilotCacheValue[],
  viewHierarchy: string,
  snapshot: string | undefined,
  comparator: SnapshotComparator,
): Promise<SingleAutoPilotCacheValue | undefined> {
  if (snapshot) {
    const snapshotHash = await generateSnapshotHash(snapshot, comparator);

    const matchedBySnapshot = cachedValues.find(cachedValue =>
      cachedValue.snapshotHash &&
      snapshotHash &&
      comparator.compareSnapshot(snapshotHash, cachedValue.snapshotHash)
    );

    if (matchedBySnapshot) {
      return matchedBySnapshot;
    }
  }
  
  const viewHierarchyHash = hashViewHierarchy(viewHierarchy);
  const matchedByViewHierarchy = cachedValues.find(cachedValue =>
    cachedValue.viewHierarchyHash === viewHierarchyHash
  );
  
  if (matchedByViewHierarchy) {
    return matchedByViewHierarchy;
  }
  
  return undefined;
}