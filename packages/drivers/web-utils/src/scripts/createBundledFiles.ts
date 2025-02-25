import path from "path";
import fs from "fs";
import * as esbuild from "esbuild";
import * as utils from "../utils";

async function bundleUtil(
  methodName: string,
  outputFilePath: string,
): Promise<string> {
  const tempDir = path.resolve(__dirname, "./temp");
  await fs.promises.mkdir(tempDir, { recursive: true });

  const tempFilePath = path.join(tempDir, `${methodName}.ts`);
  const fileContent = `
    import {${methodName}} from "../../utils";
    ${methodName}();
  `;

  await fs.promises.writeFile(tempFilePath, fileContent, "utf8");

  try {
    const { outputFiles } = await esbuild.build({
      entryPoints: [tempFilePath],
      bundle: true,
      write: false,
      format: "iife",
      target: ["chrome100"],
    });

    const [output] = outputFiles || [];

    if (!output) {
      throw new Error("Bundle generation failed: No output produced");
    }

    await fs.promises.writeFile(outputFilePath, output.text, "utf8");
    return output.text;
  } catch (error) {
    console.error(`Bundling failed for ${tempFilePath}:`, error);
    throw error;
  } finally {
    await fs.promises.unlink(tempFilePath);
  }
}

(async () => {
  const methodNames = Object.keys(utils);

  for (const methodName of methodNames) {
    const outputFilePath = path.resolve(
      __dirname,
      `../../dist/${methodName}.bundle.js`,
    );

    try {
      await bundleUtil(methodName, outputFilePath);
    } catch (error) {
      console.error(`Failed to bundle method ${methodName}:`, error);
    }
  }

  const tempDir = path.resolve(__dirname, "./temp");
  try {
    await fs.promises.rmdir(tempDir, { recursive: true });
  } catch (err) {
    console.error(`Error deleting temporary directory: ${err}`);
  }
})();
