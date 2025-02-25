import type {
  HashingAlgorithm,
  SnapshotHashing,
  SnapshotHashObject,
} from "@/types";
import { BlockHash } from "./BlockHash";

export class SnapshotComparator {
  private readonly hashingAlgorithms: Map<HashingAlgorithm, SnapshotHashing> =
    new Map();

  constructor() {
    this.hashingAlgorithms.set("BlockHash", new BlockHash(16));
  }

  public async generateHashes(snapshot: any): Promise<SnapshotHashObject> {
    if (!snapshot) {
      return {} as SnapshotHashObject;
    }
    const hashPromises = Array.from(this.hashingAlgorithms.entries()).map(
      async ([algorithm, comparator]) => {
        const hash = await comparator.hashSnapshot(snapshot);
        return [algorithm, hash] as [HashingAlgorithm, string];
      },
    );

    const hashEntries = await Promise.all(hashPromises);
    return Object.fromEntries(hashEntries) as SnapshotHashObject;
  }

  public compareSnapshot(
    newSnapshot: SnapshotHashObject,
    cachedSnapshot: SnapshotHashObject,
    threshold?: number,
  ): boolean {
    const comparisonPromises = Object.entries(cachedSnapshot).map(
      ([algorithmName, hash]) => {
        const algorithm = this.hashingAlgorithms.get(
          algorithmName as HashingAlgorithm,
        );
        return algorithm?.areSnapshotsSimilar(
          hash,
          newSnapshot[algorithmName as HashingAlgorithm],
          threshold,
        );
      },
    );

    return comparisonPromises.every((isSimilar) => isSimilar);
  }
}
