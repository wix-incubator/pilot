import { Rect } from "./types";
import comparators from "./comparators";

type CriteriaImportance =
  | { type: "weighted"; weight: number }
  | { type: "mandatory" }
  | { type: "sufficient" };

type CriteriaConfig<T> = {
  extract: (el: HTMLElement) => T | null;
  compare: (actual: T | null, expected: T, threshold?: number) => number;
  importance: CriteriaImportance;
};

export const ELEMENT_MATCHING_CONFIG: Record<string, CriteriaConfig<any>> = {
  rect: {
    extract: (el: HTMLElement): Rect => {
      const { left, top } = el.getBoundingClientRect();
      return { x: left, y: top };
    },
    compare: comparators.compareRect,
    importance: { type: "weighted", weight: 0.2 },
  },
  "aria-label": {
    extract: (el: HTMLElement): string | null => el.getAttribute("aria-label"),
    compare: comparators.compareExactString,
    importance: { type: "sufficient" },
  },
  "aria-role": {
    extract: (el: HTMLElement): string | null =>
      el.getAttribute("aria-role") || el.getAttribute("role"),
    compare: comparators.compareExactString,
    importance: { type: "weighted", weight: 0.4 },
  },
  class: {
    extract: (el: HTMLElement): string => el.className,
    compare: comparators.compareClassNames,
    importance: { type: "weighted", weight: 0.2 },
  },
  name: {
    extract: (el: HTMLElement): string | null => el.getAttribute("name"),
    compare: comparators.compareExactString,
    importance: { type: "weighted", weight: 0.5 },
  },
  title: {
    extract: (el: HTMLElement): string | null => el.getAttribute("title"),
    compare: comparators.compareExactString,
    importance: { type: "weighted", weight: 0.3 },
  },
  placeholder: {
    extract: (el: HTMLElement): string | null => el.getAttribute("placeholder"),
    compare: comparators.compareExactString,
    importance: { type: "weighted", weight: 0.3 },
  },
  "aria-labelledby": {
    extract: (el: HTMLElement) => el.getAttribute("aria-labelledby"),
    compare: comparators.compareExactString,
    importance: { type: "mandatory" },
  },
  "data-test-id": {
    extract: (el: HTMLElement) => el.getAttribute("data-test-id"),
    compare: comparators.compareExactString,
    importance: { type: "mandatory" },
  },
  "data-testid": {
    extract: (el: HTMLElement) => el.getAttribute("data-testid"),
    compare: comparators.compareExactString,
    importance: { type: "mandatory" },
  },
  href: {
    extract: (el: HTMLElement): string | null => el.getAttribute("href"),
    compare: comparators.compareExactString,
    importance: { type: "weighted", weight: 0.3 },
  },
  src: {
    extract: (el: HTMLElement): string | null => el.getAttribute("src"),
    compare: comparators.compareExactString,
    importance: { type: "weighted", weight: 0.3 },
  },
};
