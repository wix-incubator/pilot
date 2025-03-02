import { SelectorCriteria, Rect } from "./types";

type CriteriaConfig<T> = {
  extract: (el: HTMLElement) => T | null;
  compare: (
    actual: T | null,
    expected: T,
    weight: number,
    threshold?: number,
  ) => number;
  weight: number;
  enforce: boolean;
  threshold?: number;
};

//Levenshtein Distance Function
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
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
}

function compareRect(
  actual: Rect,
  expected: Rect,
  weight: number,
  threshold: number = 5,
): number {
  const dx = Math.abs(actual.x - expected.x);
  const dy = Math.abs(actual.y - expected.y);
  if (dx <= threshold && dy <= threshold) return 0;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return weight * Math.min(distance / (threshold * 2), 1);
}

function compareExactString(
  actual: string | null,
  expected: string,
  weight: number,
  threshold: number = 0,
): number {
  if (typeof actual !== "string") return weight;
  const a = actual.trim().toLowerCase();
  const b = expected.trim().toLowerCase();
  if (a === b) return 0;
  if (threshold > 0) {
    const distance = levenshtein(a, b);
    if (distance <= threshold) {
      return 0;
    }
  }
  return weight;
}

function compareClassNames(
  actual: string | null,
  expected: string,
  weight: number,
  threshold: number = 0,
): number {
  if (typeof actual !== "string") return weight;
  const actualClasses = actual.split(/\s+/).filter(Boolean);
  const expectedClasses = expected.split(/\s+/).filter(Boolean);
  const missing = expectedClasses.filter(
    (cls) => !actualClasses.includes(cls),
  ).length;
  if (threshold > 0 && missing <= threshold) {
    return 0;
  }
  return missing === 0 ? 0 : weight;
}
export const CRITERIA_CONFIG: Record<
  keyof SelectorCriteria,
  CriteriaConfig<any>
> = {
  rect: {
    extract: (el: HTMLElement): Rect => {
      const { left, top } = el.getBoundingClientRect();
      return { x: left, y: top };
    },
    compare: compareRect,
    weight: 0.2,
    enforce: false,
    threshold: 5,
  },
  "aria-label": {
    extract: (el: HTMLElement): string | null => el.getAttribute("aria-label"),
    compare: compareExactString,
    weight: 1,
    enforce: true,
    threshold: 1,
  },
  "aria-role": {
    extract: (el: HTMLElement): string | null =>
      el.getAttribute("aria-role") || el.getAttribute("role"),
    compare: compareExactString,
    weight: 0.4,
    enforce: false,
    threshold: 1,
  },
  class: {
    extract: (el: HTMLElement): string => el.className,
    compare: compareClassNames,
    weight: 0.2,
    enforce: false,
    threshold: 0,
  },
  id: {
    extract: (el: HTMLElement): string | null => el.getAttribute("data-testid"),
    compare: compareExactString,
    weight: 0.7,
    enforce: false,
    threshold: 1,
  },
  name: {
    extract: (el: HTMLElement): string | null => el.getAttribute("name"),
    compare: compareExactString,
    weight: 0.5,
    enforce: false,
    threshold: 1,
  },
  title: {
    extract: (el: HTMLElement): string | null => el.getAttribute("title"),
    compare: compareExactString,
    weight: 0.3,
    enforce: false,
    threshold: 1,
  },
  placeholder: {
    extract: (el: HTMLElement): string | null => el.getAttribute("placeholder"),
    compare: compareExactString,
    weight: 0.3,
    enforce: false,
    threshold: 1,
  },
};
