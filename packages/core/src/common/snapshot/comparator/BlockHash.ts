import { ScreenCapturerResult, SnapshotHashing } from "@/types";
import { bmvbhash } from "blockhash-core";
import { createCanvas, loadImage } from "canvas";
import type { ImageData as CanvasImageData } from "canvas";

export class BlockHash implements SnapshotHashing {
  constructor(private bits: number = 16) {}

  async hashSnapshot(
    screenCapture: ScreenCapturerResult,
  ): Promise<string | undefined> {
    if (!screenCapture.snapshot) {
      return undefined;
    }

    const snapshotData = await this.getImageData(screenCapture.snapshot);
    return bmvbhash(snapshotData, this.bits);
  }

  private async getImageData(filePath: string): Promise<CanvasImageData> {
    try {
      // Load the image using the local file path
      const image = await loadImage(filePath);

      // Create a canvas with the dimensions of the image
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");

      // Draw the image onto the canvas
      ctx.drawImage(image, 0, 0);

      // Retrieve the ImageData from the canvas (x, y, width, height)
      return ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ) as CanvasImageData;
    } catch (error) {
      console.error("Error loading image:", error);
      throw error;
    }
  }

  calculateSnapshotDistance(snapshot1: string, snapshot2: string): number {
    if (snapshot1.length !== snapshot2.length) {
      throw new Error("Snapshot lengths do not match");
    }

    let distance = 0;
    for (let i = 0; i < snapshot1.length; i++) {
      if (snapshot1[i] !== snapshot2[i]) {
        distance++;
      }
    }

    return distance;
  }

  areSnapshotsSimilar(snapshot1: string, snapshot2: string): boolean {
    // Default similarity threshold for BlockHash algorithm: 10% difference is acceptable
    const SIMILARITY_THRESHOLD = 0.1;

    const diff = this.calculateSnapshotDistance(snapshot1, snapshot2);
    const distance = diff / snapshot1.length;

    return distance <= SIMILARITY_THRESHOLD;
  }
}
