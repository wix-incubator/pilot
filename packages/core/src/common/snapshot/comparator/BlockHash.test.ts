import { BlockHash } from "./BlockHash";
import { getSnapshotImage } from "@/test-utils/SnapshotComparatorTestImages/SnapshotImageGetter";

describe("BlockHash algorithm", () => {
  const snapshotComparator = new BlockHash();
  it("should hash a snapshot", async () => {
    const snapshot = getSnapshotImage("baseline");
    const hash = await snapshotComparator.hashSnapshot({
      snapshot,
      viewHierarchy: undefined,
    });

    expect(hash).toBeDefined();
  });

  it("should return similar for the same image", async () => {
    const snapshot = getSnapshotImage("baseline");
    const hash = await snapshotComparator.hashSnapshot({
      snapshot,
      viewHierarchy: undefined,
    });
    const hash2 = await snapshotComparator.hashSnapshot({
      snapshot,
      viewHierarchy: undefined,
    });
    // Make sure hash values are defined before comparing
    expect(hash).toBeDefined();
    expect(hash2).toBeDefined();

    const similar = snapshotComparator.areSnapshotsSimilar(hash!, hash2!);
    expect(similar).toBe(true);
  });

  it("should return not similar for different images and low threshold", async () => {
    const snapshot1 = getSnapshotImage("baseline");
    const snapshot2 = getSnapshotImage("different");
    const hash1 = await snapshotComparator.hashSnapshot({
      snapshot: snapshot1,
      viewHierarchy: undefined,
    });
    const hash2 = await snapshotComparator.hashSnapshot({
      snapshot: snapshot2,
      viewHierarchy: undefined,
    });
    // Make sure hash values are defined before comparing
    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();

    const similar = snapshotComparator.areSnapshotsSimilar(hash1!, hash2!);
    expect(similar).toBe(false);
  });

  it("should return not similar for different images and medium threshold", async () => {
    const snapshot1 = getSnapshotImage("baseline");
    const snapshot2 = getSnapshotImage("different");
    const hash1 = await snapshotComparator.hashSnapshot({
      snapshot: snapshot1,
      viewHierarchy: undefined,
    });
    const hash2 = await snapshotComparator.hashSnapshot({
      snapshot: snapshot2,
      viewHierarchy: undefined,
    });
    // Make sure hash values are defined before comparing
    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();

    const similar = snapshotComparator.areSnapshotsSimilar(hash1!, hash2!);
    expect(hash1).not.toEqual(hash2);
    expect(similar).toBe(false);
  });
});
