import { Rect } from "./types";
import comparators from "./comparators";

type CriteriaConfig<T> = {
  extract: (el: HTMLElement) => T | null;
  compare: (actual: T | null, expected: T, threshold?: number) => number;
  weight: number;
  critical: boolean;
};

export const ELEMENT_MATCHING_CONFIG: Record<string, CriteriaConfig<any>> = {
  rect: {
    extract: (el: HTMLElement): Rect => {
      const { left, top } = el.getBoundingClientRect();
      return { x: left, y: top };
    },
    compare: comparators.compareRect,
    weight: 0.2,
    critical: false,
  },
  "aria-label": {
    extract: (el: HTMLElement): string | null => el.getAttribute("aria-label"),
    compare: comparators.compareExactString,
    weight: 1,
    critical: true,
  },
  "aria-role": {
    extract: (el: HTMLElement): string | null =>
      el.getAttribute("aria-role") || el.getAttribute("role"),
    compare: comparators.compareExactString,
    weight: 0.4,
    critical: false,
  },
  class: {
    extract: (el: HTMLElement): string => el.className,
    compare: comparators.compareClassNames,
    weight: 0.2,
    critical: false,
  },
  name: {
    extract: (el: HTMLElement): string | null => el.getAttribute("name"),
    compare: comparators.compareExactString,
    weight: 0.5,
    critical: false,
  },
  title: {
    extract: (el: HTMLElement): string | null => el.getAttribute("title"),
    compare: comparators.compareExactString,
    weight: 0.3,
    critical: false,
  },
  placeholder: {
    extract: (el: HTMLElement): string | null => el.getAttribute("placeholder"),
    compare: comparators.compareExactString,
    weight: 0.3,
    critical: false,
  },
  "aria-labelledby": {
    extract: (el: HTMLElement) => el.getAttribute("aria-labelledby"),
    compare: comparators.compareExactString,
    weight: 1,
    critical: true,
  },
  "data-test-id": {
    extract: (el: HTMLElement) => el.getAttribute("data-test-id"),
    compare: comparators.compareExactString,
    weight: 1,
    critical: true,
  },
  "data-testid": {
    extract: (el: HTMLElement) => el.getAttribute("data-testid"),
    compare: comparators.compareExactString,
    weight: 1,
    critical: true,
  },
};
