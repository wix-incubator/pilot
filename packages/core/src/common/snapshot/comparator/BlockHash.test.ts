import { BlockHash } from "./BlockHash";
import { getSnapshotImage } from "@/test-utils/SnapshotComparatorTestImages/SnapshotImageGetter";
import path from "path";
import fs from "fs";
import { PNG } from "pngjs";

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

  it("should generate a valid hash for a real image", async () => {
    // Use the test_img.png in the same directory
    const testImgPath = path.join(__dirname, "test_img.png");

    // To bypass the mocked implementation in our test file, we will create a new instance
    // and directly call the bmvbhash method
    const blockHash = new BlockHash(16);

    // We will directly use the PNG synchronous read API since we know the path
    // This is equivalent to calling hashSnapshot without the mock intercepts
    const pngData = fs.readFileSync(testImgPath);
    const png = PNG.sync.read(pngData);

    // Access the private bmvbhash method using type casting
    const hash = (blockHash as any).bmvbhash(png, 16);

    // Store the hash as a snapshot so we can detect if the algorithm changes
    expect(hash).toMatchInlineSnapshot(
      `"00000000060007e007e007e000c07ffc3ffc000006e007e0000007c000000000"`,
    );
  });
});
