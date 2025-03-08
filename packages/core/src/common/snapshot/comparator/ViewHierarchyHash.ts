import { ScreenCapturerResult, SnapshotHashing } from "@/types";
import * as crypto from "crypto";

/**
 * ViewHierarchyHash implements a hashing algorithm for view hierarchies.
 * It uses MD5 to generate a hash of the view hierarchy string.
 */
export class ViewHierarchyHash implements SnapshotHashing {
  async hashSnapshot(
    screenCapture: ScreenCapturerResult,
  ): Promise<string | undefined> {
    if (!screenCapture.viewHierarchy) {
      return undefined;
    }

    return crypto
      .createHash("md5")
      .update(screenCapture.viewHierarchy)
      .digest("hex");
  }

  areSnapshotsSimilar(hash1: string, hash2: string): boolean {
    if (!hash1 || !hash2) {
      return false;
    }

    return hash1 === hash2;
  }
}
