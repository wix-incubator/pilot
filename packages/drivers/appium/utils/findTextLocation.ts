import path from "path";
import {writeFileSync} from "fs";
import {getTextCoordinates} from "./getTextCoordinates";

async function findTextLocation (word: string) {
    const base64Image = await driver.takeScreenshot();
    if (!base64Image) throw new Error("Failed to capture screenshot");

    const tempImagePath = path.join(__dirname, "temp_screenshot.png");
    writeFileSync(tempImagePath, base64Image, { encoding: "base64" });

    const screenSize = await driver.getWindowSize();
    const rawPoints = await getTextCoordinates(tempImagePath, word);

    return rawPoints.map(({ x, y }) => ({
        x: x * screenSize.width,
        y: y * screenSize.height,
    }));
}

export { findTextLocation };
