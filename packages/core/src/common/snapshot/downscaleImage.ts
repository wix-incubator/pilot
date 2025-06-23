import path from "path";
import os from "os";
import logger from "@/common/logger";
import { createReadStream, createWriteStream, existsSync } from "fs";
import { PNG } from "pngjs";

const MAX_PIXELS = 2000000;

async function downscaleImage(imagePath: string): Promise<string> {
  try {
    if (!existsSync(imagePath)) {
      return imagePath;
    }

    const readPNG = () => {
      return new Promise<PNG>((resolve, reject) => {
        const png = new PNG();
        try {
          createReadStream(imagePath)
            .pipe(png)
            .on("parsed", () => {
              resolve(png);
            })
            .on("error", reject);
        } catch (error) {
          reject(error);
        }
      });
    };

    const sourceImage = await readPNG();

    const originalWidth = sourceImage.width;
    const originalHeight = sourceImage.height;
    const originalTotalPixels = originalWidth * originalHeight;

    if (originalTotalPixels <= MAX_PIXELS) {
      return imagePath;
    }

    const aspectRatio = originalWidth / originalHeight;
    const newHeight = Math.sqrt(MAX_PIXELS / aspectRatio);
    const newWidth = newHeight * aspectRatio;
    const targetWidth = Math.round(newWidth);
    const targetHeight = Math.round(newHeight);

    const targetImage = new PNG({
      width: targetWidth,
      height: targetHeight,
      filterType: -1,
    });

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.floor((x * originalWidth) / targetWidth);
        const srcY = Math.floor((y * originalHeight) / targetHeight);

        const srcIdx = (srcY * originalWidth + srcX) * 4;
        const targetIdx = (y * targetWidth + x) * 4;

        targetImage.data[targetIdx] = sourceImage.data[srcIdx];
        targetImage.data[targetIdx + 1] = sourceImage.data[srcIdx + 1];
        targetImage.data[targetIdx + 2] = sourceImage.data[srcIdx + 2];
        targetImage.data[targetIdx + 3] = sourceImage.data[srcIdx + 3];
      }
    }

    const parsedPath = path.parse(imagePath);
    parsedPath.dir = os.tmpdir();
    parsedPath.name += "_downscaled";
    parsedPath.ext = ".png";
    const downscaledPath = path.format(parsedPath);

    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(downscaledPath);
      targetImage
        .pack()
        .pipe(writeStream)
        .on("finish", () => resolve())
        .on("error", reject);
    });

    return downscaledPath;
  } catch (err) {
    await logger.error({
      message: `Error processing image: ${err}`,
      isBold: false,
      color: "gray",
    });

    return imagePath;
  }
}

export default downscaleImage;
