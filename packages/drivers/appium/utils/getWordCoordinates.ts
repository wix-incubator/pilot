import * as Tesseract from "tesseract.js";
import { readFileSync } from "fs";
import * as probe from "probe-image-size";

/**
 * Gets image dimensions using probe-image-size
 */
async function getImageDimensions(
  imagePath: string,
): Promise<{ width: number; height: number }> {
  try {
    const buffer = readFileSync(imagePath);
    const dimensions = probe.sync(buffer);
    if (!dimensions) {
      console.error(
        `Failed to probe image dimensions for ${imagePath}: probe.sync returned null`,
      );
      return { width: 1200, height: 800 };
    }
    return {
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    console.error(`Failed to get image dimensions for ${imagePath}:`, error);
    return { width: 1200, height: 800 };
  }
}
/**
 * Sorts coordinates left to right (by x), then top to bottom (by y if x is equal)
 */
function sortCoordinates(
  coords: { x: number; y: number }[],
): { x: number; y: number }[] {
  return coords.sort((a, b) => {
    if (a.x === b.x) return a.y - b.y;
    return a.x - b.x;
  });
}

/**
 * Removes near-duplicate coordinates based on a small epsilon threshold
 */
function deduplicateCoordinates(
  coords: { x: number; y: number }[],
  epsilon = 1e-6,
): { x: number; y: number }[] {
  const unique: { x: number; y: number }[] = [];

  for (const point of coords) {
    const isDuplicate = unique.some(
      (p) =>
        Math.abs(p.x - point.x) < epsilon && Math.abs(p.y - point.y) < epsilon,
    );

    if (!isDuplicate) {
      unique.push(point);
    }
  }

  return unique;
}

/**
 * Finds the coordinates of a word in an image
 * @param imagePath - Array of URL or path to the image
 * @param word - The word to search for
 * @returns Array of normalized center coordinates (0-1) where the word was found
 */
async function getWordCoordinates(imagePath: string | string[], word: string) {
  const worker = await Tesseract.createWorker("eng");

  const results = [];
  const paths = typeof imagePath === "string" ? [imagePath] : imagePath;

  for (const path of paths) {
    try {
      const result = await worker.recognize(path, {}, { blocks: true });
      const imageDimensions = await getImageDimensions(path);
      results.push({ result, imageDimensions });
    } catch (error) {
      console.error(`Failed to open or process image at ${path}:`, error);
    }
  }

  await worker.terminate();

  const coordinates = [];
  for (const { result, imageDimensions } of results) {
    const imageWidth = imageDimensions.width;
    const imageHeight = imageDimensions.height;

    if (result.data?.blocks) {
      for (const block of result.data.blocks) {
        for (const paragraph of block.paragraphs || []) {
          for (const line of paragraph.lines || []) {
            for (const foundWord of line.words || []) {
              if (foundWord.text?.toLowerCase() === word.toLowerCase()) {
                coordinates.push({
                  x: (foundWord.bbox.x0 + foundWord.bbox.x1) / 2 / imageWidth,
                  y: (foundWord.bbox.y0 + foundWord.bbox.y1) / 2 / imageHeight,
                });
              }
            }
          }
        }
      }
    }
  }
  const allCoords = coordinates.flat();
  const sorted = sortCoordinates(allCoords);
  const deduped = deduplicateCoordinates(sorted);

  return deduped;
}

export { getWordCoordinates };
