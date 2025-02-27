import getElementCategory, { tags } from "./getElementCategory";
import isElementHidden from "./isElementHidden";
import { ElementCategory } from "./types";

declare global {
  interface Window {
    createMarkedViewHierarchy: () => string;
  }
}

interface Rect {
  x: number;
  y: number;
}

interface SelectorCriteria {
  rect?: Rect;
  "aria-label"?: string;
  "aria-role"?: string;
  class?: string;
  id?: string;
  name?: string;
  title?: string;
  placeholder?: string;
}

interface AttributeRule {
  weight: number;
  enforce: boolean;
}

interface InterestingAttributes {
  rect: Rect;
  "aria-label": string | null;
  "aria-role": string | null;
  class: string;
  id: string | null;
  name: string | null;
  title: string | null;
  placeholder: string | null;
}

const ATTRIBUTE_RULES: Record<keyof SelectorCriteria, AttributeRule> = {
  rect: { weight: 0.2, enforce: false },
  "aria-label": { weight: 1, enforce: true },
  "aria-role": { weight: 0.4, enforce: false },
  class: { weight: 0.2, enforce: false },
  id: { weight: 0.7, enforce: false },
  name: { weight: 0.5, enforce: false },
  title: { weight: 0.3, enforce: false },
  placeholder: { weight: 0.3, enforce: false },
};

/**
 * Retrieves the “interesting” attributes from an element.
 * For `rect`, it uses the element’s top-left (x, y) coordinates.
 */
function getInterestingAttributes(element: HTMLElement): InterestingAttributes {
  const rect = element.getBoundingClientRect();
  return {
    rect: { x: rect.left, y: rect.top },
    "aria-label": element.getAttribute("aria-label"),
    "aria-role":
      element.getAttribute("aria-role") || element.getAttribute("role"),
    class: element.className,
    id: element.getAttribute("data-testid"),
    name: element.getAttribute("name"),
    title: element.getAttribute("title"),
    placeholder: element.getAttribute("placeholder"),
  };
}

function calcRectError(actual: Rect, expected: Rect, weight: number): number {
  const dx = Math.abs(actual.x - expected.x);
  const dy = Math.abs(actual.y - expected.y);
  return dx <= 5 && dy <= 5 ? 0 : weight;
}

function calcError(actual: any, expected: any, weight: number): number {
  if (actual == null) return weight;
  return actual === expected ? 0 : weight;
}

export function findElementWithLowestError(
  criteria: SelectorCriteria,
): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll("*"),
  ) as HTMLElement[];
  let bestCandidate: HTMLElement | null = null;
  let lowestDelta = Infinity;
  if (criteria["aria-label"])
    return document.querySelector(`[aria-label="${criteria["aria-label"]}"]`);
  for (const candidate of candidates) {
    let delta = 0;
    const attrs = getInterestingAttributes(candidate);
    for (const key in criteria) {
      const attrKey = key as keyof SelectorCriteria;
      const rule = ATTRIBUTE_RULES[attrKey];
      const expected = criteria[attrKey];
      if (expected != null) {
        const actual = attrs[attrKey as keyof InterestingAttributes];
        if (attrKey === "rect" && typeof expected === "object" && actual) {
          delta += calcRectError(actual as Rect, expected as Rect, rule.weight);
        } else {
          delta += calcError(actual, expected, rule.weight);
        }
      }
    }
    if (delta < lowestDelta) {
      lowestDelta = delta;
      bestCandidate = candidate;
    }
  }
  return bestCandidate;
}

const CATEGORY_COLORS: Record<ElementCategory, [string, string]> = {
  button: ["#ff0000", "#ffffff"],
  link: ["#0aff0a", "#000000"],
  input: ["#0000ff", "#ffffff"],
  list: ["#ff00ff", "#000000"],
  table: ["#ff6a02", "#ffffff"],
  header: ["#00c2ff", "#000000"],
  semantic: ["#bababa", "#000000"],
  scrollable: ["#23333f", "#ffffff"],
};

const ESSENTIAL_ELEMENTS = ["HTML", "HEAD", "BODY"];

export function markImportantElements(options?: { includeHidden?: boolean }) {
  const selector = tags.join(",");
  const elements = Array.from(document.querySelectorAll(selector));
  const categoryCounts = new Map<ElementCategory, number>();

  elements.forEach((el) => {
    if (!options?.includeHidden && isElementHidden(el)) return;

    const category = getElementCategory(el);
    if (!category) return;

    const index = categoryCounts.get(category) || 0;
    el.setAttribute("aria-pilot-category", category);
    el.setAttribute("aria-pilot-index", index.toString());
    categoryCounts.set(category, index + 1);
  });
}

export function createMarkedViewHierarchy() {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;

  function processElement(element: Element, depth = 0): string {
    const children = Array.from(element.children);
    let structure = "";
    let childStructure = "";
    for (const child of children) {
      const childStr = processElement(child, depth + 1);
      if (childStr) {
        childStructure += childStr;
      }
    }
    const isImportantElement =
      element.hasAttribute("aria-pilot-category") ||
      ESSENTIAL_ELEMENTS.includes(element.tagName);

    if (isImportantElement || childStructure) {
      const indent = "  ".repeat(depth);
      structure += `${indent}<${element.tagName.toLowerCase()}`;
      Array.from(element.attributes)
        .filter(
          (attr) =>
            attr.name.match(/^aria-/i) || // all aria-* attributes
            [
              "href",
              "target",
              "src",
              "alt",
              "type",
              "name",
              "value",
              "role",
            ].includes(attr.name.toLowerCase()),
        )
        .forEach((attr) => {
          structure += ` ${attr.name}="${attr.value}"`;
        });
      const interestingAttrs = getInterestingAttributes(element as HTMLElement);
      for (const [attr, value] of Object.entries(interestingAttrs)) {
        if (value != null && value !== "") {
          structure += ` ${attr}="${JSON.stringify(value)}"`;
        }
      }
      const category = element.getAttribute("aria-pilot-category");
      const index = element.getAttribute("aria-pilot-index");
      if (category) {
        structure += ` data-category="${category}" data-index="${index}"`;
      }
      structure += ">\n";

      if (childStructure) {
        structure += childStructure;
      }

      structure += `${indent}</${element.tagName.toLowerCase()}>\n`;
    }

    return structure;
  }

  return processElement(clone);
}

export function highlightMarkedElements() {
  const styleId = "aria-pilot-styles";
  const containerId = "aria-pilot-overlay-container";

  // Remove old styles and container if they exist.
  const oldStyle = document.getElementById(styleId);
  const oldContainer = document.getElementById(containerId);
  oldStyle?.remove();
  oldContainer?.remove();

  // Create overlay container for labels.
  const container = document.createElement("div");
  container.id = containerId;
  Object.assign(container.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  document.body.appendChild(container);

  // Create style element.
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = Object.entries(CATEGORY_COLORS)
    .map(
      ([category, color]) => `
      [aria-pilot-category="${category}"]::after {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        pointer-events: none !important;
        outline: 2px solid ${color[0]} !important;
        outline-offset: 1px !important;
        background: ${color[0]}15 !important;
        mix-blend-mode: multiply !important;
        z-index: 2147483646 !important;
      }
      
      [aria-pilot-category="${category}"] {
        position: relative !important;
      }

      .aria-pilot-label[data-category="${category}"] {
        background: ${color[0]}CC !important;
        color: ${color[1]} !important;
        font: 10px monospace !important;
        padding: 2px 4px !important;
        border-radius: 2px !important;
        white-space: nowrap !important;
        position: absolute !important;
        transform: translateY(-100%) !important;
        margin-top: -2px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
      }
    `,
    )
    .join("\n");
  document.head.appendChild(style);

  // Create labels for each marked element.
  const elements = document.querySelectorAll("[aria-pilot-category]");
  elements.forEach((el) => {
    const category = el.getAttribute("aria-pilot-category");
    const index = el.getAttribute("aria-pilot-index");
    if (!category || !index) return;

    const label = document.createElement("div");
    label.className = "aria-pilot-label";
    label.dataset.category = category;
    label.textContent = `${category} #${index}`;

    // Position the label relative to the element.
    const rect = el.getBoundingClientRect();
    Object.assign(label.style, {
      left: `${rect.left + window.scrollX}px`,
      top: `${rect.top + window.scrollY}px`,
    });

    container.appendChild(label);

    // Update label position on scroll and resize.
    const updatePosition = () => {
      const newRect = el.getBoundingClientRect();
      Object.assign(label.style, {
        left: `${newRect.left + window.scrollX}px`,
        top: `${newRect.top + window.scrollY}px`,
      });
    };

    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });
  });
}

export function removeMarkedElementsHighlights() {
  const style = document.getElementById("aria-pilot-styles");
  const container = document.getElementById("aria-pilot-overlay-container");
  style?.remove();
  container?.remove();
}

if (typeof window !== "undefined") {
  window.createMarkedViewHierarchy = createMarkedViewHierarchy;
}
