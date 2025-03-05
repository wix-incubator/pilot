import fs from "fs";
import path from "path";
import logger from "@/common/logger";

/**
 * Creates directory recursively if it doesn't exist
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Reads a JSON file and parses its contents
 * Returns undefined if file doesn't exist or is invalid
 */
export function readJsonFile<T>(filePath: string): T | undefined {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch (error) {
    logger.warn(
      `Error reading file ${filePath}: ${error instanceof Error ? error.message : error}`,
    );
  }
  return undefined;
}

/**
 * Writes data to a JSON file, creating parent directories if needed
 */
export function writeJsonFile(filePath: string, data: unknown): boolean {
  try {
    const dirPath = path.dirname(filePath);
    ensureDirectoryExists(dirPath);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), {
      flag: "w+",
    });
    return true;
  } catch (error) {
    logger.error(
      `Error writing file ${filePath}: ${error instanceof Error ? error.message : error}`,
    );
    return false;
  }
}
