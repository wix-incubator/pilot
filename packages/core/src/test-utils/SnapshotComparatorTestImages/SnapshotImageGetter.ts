import path from "path";

type image =
  | "baseline"
  | "different"
  | "grayed"
  | "very_different_colors"
  | "with_text";
const imageFileNames: Record<image, string> = {
  baseline: "baseline.png",
  different: "different.png",
  grayed: "grayed.png",
  very_different_colors: "very_different_colors.png",
  with_text: "with_text.png",
};

export const getSnapshotImage = (image: image) => {
  return path.resolve(__dirname, ".", imageFileNames[image]);
};
