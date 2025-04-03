import { Rect } from "./types";

const comparators = {
  compareRect(actual: Rect, expected: Rect, threshold: number = 5): number {
    const dx = Math.abs(actual.x - expected.x);
    const dy = Math.abs(actual.y - expected.y);
    if (dx <= threshold && dy <= threshold) return 0;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.min(distance / (threshold * 2), 1);
  },

  compareExactString(actual: string | null, expected: string): number {
    if (typeof actual !== "string") return 1;
    const a = actual.trim().toLowerCase();
    const b = expected.trim().toLowerCase();
    return a === b ? 0 : 1;
  },

  compareClassNames(
    actual: string | null,
    expected: string,
    threshold: number = 1,
  ): number {
    if (typeof actual !== "string") return 1;
    const actualClasses = actual.split(/\s+/).filter(Boolean);
    const expectedClasses = expected.split(/\s+/).filter(Boolean);
    const missing = expectedClasses.filter(
      (cls) => !actualClasses.includes(cls),
    ).length;
    if (threshold > 0 && missing <= threshold) return 0;
    return missing === 0 ? 0 : 1;
  },
};

export default comparators;
