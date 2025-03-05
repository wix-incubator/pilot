import { Rect } from "./types";

const comparators = {
  levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      Array(n + 1).fill(0),
    );
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      }
    }
    return dp[m][n];
  },

  compareRect(actual: Rect, expected: Rect, threshold: number = 5): number {
    const dx = Math.abs(actual.x - expected.x);
    const dy = Math.abs(actual.y - expected.y);
    if (dx <= threshold && dy <= threshold) return 0;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.min(distance / (threshold * 2), 1);
  },

  compareExactString(
    actual: string | null,
    expected: string,
    threshold: number = 1,
  ): number {
    if (typeof actual !== "string") return 1;
    const a = actual.trim().toLowerCase();
    const b = expected.trim().toLowerCase();
    if (a === b) return 0;
    if (threshold > 0 && comparators.levenshtein(a, b) <= threshold) {
      return 0;
    }
    return 1;
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
