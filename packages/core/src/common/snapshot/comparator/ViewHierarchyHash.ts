import { SnapshotHashing } from "@/types";
import * as crypto from "crypto";

/**
 * ViewHierarchyHash implements a hashing algorithm for view hierarchies.
 * It uses MD5 to generate a hash of the view hierarchy string.
 */
export class ViewHierarchyHash implements SnapshotHashing {
  /**
   * Creates a hash for the provided view hierarchy string
   * @param viewHierarchy The view hierarchy string to hash
   * @returns A hash string representing the view hierarchy
   */
  async hashSnapshot(viewHierarchy: string): Promise<string> {
    if (!viewHierarchy) {
      return "";
    }

    // Create an MD5 hash of the view hierarchy
    return crypto.createHash("md5").update(viewHierarchy).digest("hex");
  }

  /**
   * Determines if two view hierarchy hashes represent similar view hierarchies
   * For ViewHierarchyHash, similarity is binary - either exact match or not a match
   * @param hash1 First hash
   * @param hash2 Second hash
   * @returns True if the hashes exactly match
   */
  areSnapshotsSimilar(hash1: string, hash2: string): boolean {
    if (!hash1 || !hash2) {
      return false;
    }
    
    return hash1 === hash2;
  }
}