import { SelectorCriteria, Rect } from "./types";

type CriteriaConfig<T> = {
  extract: (el: HTMLElement) => T | null;
  compare: (actual: T | null, expected: T, weight: number) => number;
  weight: number;
  enforce: boolean;
};

function compareRect(actual: Rect, expected: Rect, weight: number): number {
  const dx = Math.abs(actual.x - expected.x);
  const dy = Math.abs(actual.y - expected.y);
  const threshold = 5;
  if (dx <= threshold && dy <= threshold) return 0;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return weight * Math.min(distance / (threshold * 2), 1);
}

function compareExactString(
  actual: string | null,
  expected: string,
  weight: number,
): number {
  if (typeof actual !== "string") return weight;
  return actual.trim().toLowerCase() === expected.trim().toLowerCase()
    ? 0
    : weight;
}

function compareClassNames(
  actual: string | null,
  expected: string,
  weight: number,
): number {
  if (typeof actual !== "string") return weight;
  const actualClasses = actual.split(/\s+/).filter(Boolean);
  const expectedClasses = expected.split(/\s+/).filter(Boolean);
  const allMatch = expectedClasses.every((cls) => actualClasses.includes(cls));
  return allMatch ? 0 : weight;
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
  },
  "aria-label": {
    extract: (el: HTMLElement): string | null => el.getAttribute("aria-label"),
    compare: compareExactString,
    weight: 1,
    enforce: true,
  },
  "aria-role": {
    extract: (el: HTMLElement): string | null =>
      el.getAttribute("aria-role") || el.getAttribute("role"),
    compare: compareExactString,
    weight: 0.4,
    enforce: false,
  },
  class: {
    extract: (el: HTMLElement): string => el.className,
    compare: compareClassNames,
    weight: 0.2,
    enforce: false,
  },
  id: {
    extract: (el: HTMLElement): string | null => el.getAttribute("data-testid"),
    compare: compareExactString,
    weight: 0.7,
    enforce: false,
  },
  name: {
    extract: (el: HTMLElement): string | null => el.getAttribute("name"),
    compare: compareExactString,
    weight: 0.5,
    enforce: false,
  },
  title: {
    extract: (el: HTMLElement): string | null => el.getAttribute("title"),
    compare: compareExactString,
    weight: 0.3,
    enforce: false,
  },
  placeholder: {
    extract: (el: HTMLElement): string | null => el.getAttribute("placeholder"),
    compare: compareExactString,
    weight: 0.3,
    enforce: false,
  },
};
