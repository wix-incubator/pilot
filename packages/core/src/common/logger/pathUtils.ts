import * as path from "path";
import * as fs from "fs";

/**
 * Finds the project root directory by searching upwards from the startPath
 * for a directory containing a 'package.json' file.
 *
 * @param startPath - The starting file or directory path.
 * @returns The absolute path to the project root directory, or null if not found.
 */
export function findProjectRoot(startPath: string): string | null {
  let currentDir = path.dirname(startPath); // Start from the directory containing the file

  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  const packageJsonPath = path.join(currentDir, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    return currentDir;
  }

  return null;
}

/**
 * Calculates the relative path from a root path to a file path.
 *
 * @param filePath - The absolute path to the file.
 * @param rootPath - The absolute path to the root directory.
 * @returns The relative path.
 */
export function getRelativePath(filePath: string, rootPath: string): string {
  return path.relative(rootPath, filePath);
}
