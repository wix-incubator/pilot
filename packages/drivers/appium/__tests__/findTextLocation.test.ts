import { findTextLocation } from "../utils/findTextLocation";

import path from "path";
import fs from "fs";
import { getTextCoordinates } from "../utils/getTextCoordinates";

// Mocks
jest.mock("fs");
jest.mock("../utils/getTextCoordinates");

// Mock driver globally
(global as any).driver = {
  takeScreenshot: jest.fn(),
  getWindowSize: jest.fn(),
};

describe("findTextLocation", () => {
  const mockBase64 = "fakebase64string";
  const mockImagePath = path.join(__dirname, "../utils/temp_screenshot.png");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return scaled coordinates for found text", async () => {
    (driver.takeScreenshot as jest.Mock).mockResolvedValue(mockBase64);
    (driver.getWindowSize as jest.Mock).mockResolvedValue({
      width: 1000,
      height: 800,
    });
    (getTextCoordinates as jest.Mock).mockResolvedValue([{ x: 0.1, y: 0.2 }]);

    const result = await findTextLocation("Hello");

    expect(fs.writeFileSync).toHaveBeenCalledWith(mockImagePath, mockBase64, {
      encoding: "base64",
    });

    expect(getTextCoordinates).toHaveBeenCalledWith(mockImagePath, "Hello");
    expect(result).toEqual([{ x: 100, y: 160 }]);
  });

  it("should throw if screenshot fails", async () => {
    (driver.takeScreenshot as jest.Mock).mockResolvedValue(null);

    await expect(findTextLocation("Fail")).rejects.toThrow(
      "Failed to capture screenshot",
    );
  });
});
