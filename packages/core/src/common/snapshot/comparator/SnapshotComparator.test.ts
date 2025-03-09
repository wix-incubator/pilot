import { SnapshotComparator } from "./SnapshotComparator";
import { getSnapshotImage } from "@/test-utils/SnapshotComparatorTestImages/SnapshotImageGetter";

describe("SnapshotComparator", () => {
  const snapshotComparator = new SnapshotComparator();

  it("should hash a snapshot", async () => {
    const snapshot = getSnapshotImage("baseline");
    const hash = await snapshotComparator.generateHashes({
      snapshot,
      viewHierarchy: undefined,
    });

    expect(hash).toBeDefined();
  });

  it("should be similar for the same image", async () => {
    const snapshot = getSnapshotImage("baseline");
    const hash = await snapshotComparator.generateHashes({
      snapshot,
      viewHierarchy: undefined,
    });
    const hash2 = await snapshotComparator.generateHashes({
      snapshot,
      viewHierarchy: undefined,
    });
    const isSimilar = snapshotComparator.compareSnapshot(hash2, hash);
    expect(isSimilar).toBeTruthy();
  });

  it("should identify when images are different", async () => {
    const snapshot1 = getSnapshotImage("baseline");
    const snapshot2 = getSnapshotImage("different");

    const hash1 = await snapshotComparator.generateHashes({
      snapshot: snapshot1,
      viewHierarchy: undefined,
    });
    const hash2 = await snapshotComparator.generateHashes({
      snapshot: snapshot2,
      viewHierarchy: undefined,
    });
    const isSimilar = snapshotComparator.compareSnapshot(hash2, hash1);

    expect(hash2).not.toEqual(hash1);
    expect(isSimilar).toBeFalsy();
  });

  it("should match when BlockHash is similar even if ViewHierarchy is different", async () => {
    const snapshot1 = getSnapshotImage("baseline");
    const snapshot2 = getSnapshotImage("with_text"); // Similar enough visual image but different structure

    const hash1 = await snapshotComparator.generateHashes({
      snapshot: snapshot1,
      viewHierarchy: "<View><Button>OK</Button></View>",
    });

    const hash2 = await snapshotComparator.generateHashes({
      snapshot: snapshot2,
      viewHierarchy: "<View><Text>Different</Text><Button>OK</Button></View>",
    });

    const { BlockHash: blockHash1 } = hash1;
    const { BlockHash: blockHash2 } = hash2;
    const { ViewHierarchyHash: viewHash1 } = hash1;
    const { ViewHierarchyHash: viewHash2 } = hash2;

    const blockHashAlgorithm = (
      snapshotComparator as any
    ).hashingAlgorithms.get("BlockHash");
    const viewHierarchyAlgorithm = (
      snapshotComparator as any
    ).hashingAlgorithms.get("ViewHierarchyHash");

    const blockHashSimilar = blockHashAlgorithm.areSnapshotsSimilar(
      blockHash1,
      blockHash2,
    );
    const viewHierarchyDifferent = !viewHierarchyAlgorithm.areSnapshotsSimilar(
      viewHash1,
      viewHash2,
    );

    expect(blockHashSimilar).toBeTruthy();
    expect(viewHierarchyDifferent).toBeTruthy();

    const isSimilar = snapshotComparator.compareSnapshot(hash1, hash2);
    expect(isSimilar).toBeTruthy();
  });
});
