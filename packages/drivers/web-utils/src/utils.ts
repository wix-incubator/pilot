import getElementCategory, { tags } from "./getElementCategory";
import isElementHidden from "./isElementHidden";
import { ElementCategory } from "./types";

declare global {
  interface Window {
    createMarkedViewHierarchy: () => string;
  }
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

const ATTRIBUTE_WHITELIST: Record<string, string[]> = {
  "*": ["aria-pilot-category", "aria-pilot-index", "aria-pilot-id"],
  a: ["href", "target"],
  img: ["src", "alt"],
  input: ["type", "name", "value"],
  meta: ["name", "content"],
  link: ["rel", "href"],
  script: ["src", "type"],
};

const ESSENTIAL_ELEMENTS = ["HTML", "HEAD", "BODY"];

/**
 * Returns all elements under root sorted by their on-screen position.
 */
function getVisuallySortedElements(root: Element): Element[] {
  const result: Element[] = [];

  function dfs(node: Element) {
    const children = Array.from(node.children);
    children.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (ra.top !== rb.top) return ra.top - rb.top;
      if (ra.left !== rb.left) return ra.left - rb.left;
      return 0;
    });
    for (const child of children) {
      result.push(child);
      dfs(child);
    }
  }

  dfs(root);
  return result;
}

/**
 * A simple hash function to compute a hash from a string.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return (hash >>> 0).toString(16);
}

/**
 * Computes a stable unique identifier for an element based on intrinsic properties.
 */
function computeUniqueId(el: Element): string {
  if (el.hasAttribute("aria-label")) {
    return simpleHash(el.getAttribute("aria-label")!);
  }
  const tag = el.tagName.toLowerCase();
  const allowedAttrs = new Set(
    ATTRIBUTE_WHITELIST["*"].concat(ATTRIBUTE_WHITELIST[tag] || []),
  );
  const attributes: Record<string, string> = {};
  Array.from(el.attributes).forEach((attr) => {
    if (allowedAttrs.has(attr.name.toLowerCase())) {
      attributes[attr.name.toLowerCase()] = attr.value;
    }
  });
  // round to nearest multiply by 5
  const rect = el.getBoundingClientRect();
  const roundedRect = {
    top: Math.round(rect.top / 5) * 5,
    left: Math.round(rect.left / 5) * 5,
    width: Math.round(rect.width / 5) * 5,
    height: Math.round(rect.height / 5) * 5,
  };

  const text = (el.textContent || "").trim();

  function getDomPath(element: Element): string {
    let path = "";
    while (element.parentElement) {
      const siblings = Array.from(element.parentElement.children);
      const index = siblings.indexOf(element);
      path = `/${element.tagName.toLowerCase()}[${index}]` + path;
      element = element.parentElement;
    }
    return path;
  }
  const domPath = getDomPath(el);
  const dataToHash = { tag, attributes, roundedRect, text, domPath };
  const hashString = JSON.stringify(dataToHash, Object.keys(dataToHash).sort());
  return simpleHash(hashString);
}

/**
 * Marks important elements by setting category, index, and a stable unique identifier.
 */
export function markImportantElements(options?: { includeHidden?: boolean }) {
  const visuallyOrdered = getVisuallySortedElements(document.body);
  const relevant = visuallyOrdered.filter((el) => {
    if (!options?.includeHidden && isElementHidden(el)) {
      return false;
    }
    return tags.includes(el.tagName.toLowerCase());
  });

  const categoryCounts = new Map<ElementCategory, number>();

  relevant.forEach((el) => {
    const category = getElementCategory(el);
    if (!category) return;

    const currentCount = categoryCounts.get(category) || 0;
    el.setAttribute("aria-pilot-category", category);
    el.setAttribute("aria-pilot-id", computeUniqueId(el));
    categoryCounts.set(category, currentCount + 1);
  });
}

/**
 * Recursively builds a marked HTML structure from a cloned document.
 */
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
      const category = element.getAttribute("aria-pilot-category");
      const id = element.getAttribute("aria-pilot-id");
      const indent = "  ".repeat(depth);
      structure += `${indent}<${element.tagName.toLowerCase()}`;

      const tagName = element.tagName.toLowerCase();
      const allowedAttrs = [
        ...ATTRIBUTE_WHITELIST["*"],
        ...(ATTRIBUTE_WHITELIST[tagName] || []),
      ];

      Array.from(element.attributes)
        .filter((attr) => allowedAttrs.includes(attr.name.toLowerCase()))
        .forEach((attr) => {
          structure += ` ${attr.name}="${attr.value}"`;
        });

      if (category) {
        structure += ` data-category="${category}"`;
      }
      if (id) {
        structure += ` data-id="${id}"`;
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

/**
 * Adds highlighting styles for the marked elements.
 */
export function highlightMarkedElements() {
  const styleId = "aria-pilot-styles";
  const oldStyle = document.getElementById(styleId);
  if (oldStyle) oldStyle.remove();

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = Object.entries(CATEGORY_COLORS)
    .map(
      ([category, color]) => `
      [aria-pilot-category="${category}"] {
        position: relative !important;
        box-shadow: 0 0 0 2px ${color[0]} !important;
        z-index: auto !important;
      }
      [aria-pilot-category="${category}"]::before {
        content: "${category} #" attr(aria-pilot-index) " - " attr(aria-pilot-id);
        position: absolute !important;
        top: -20px !important;
        left: 0 !important;
        background: ${color[0]};
        opacity: 0.5;
        color: ${color[1]};
        font: 10px monospace;
        padding: 2px 4px;
        white-space: nowrap;
        z-index: 2147483647 !important;
        pointer-events: none !important;
      }
    `,
    )
    .join("\n");
  document.head.appendChild(style);
}

/**
 * Removes the highlighting styles.
 */
export function removeMarkedElementsHighlights() {
  const style = document.getElementById("aria-pilot-styles");
  style?.remove();
}

if (typeof window !== "undefined") {
  window.createMarkedViewHierarchy = createMarkedViewHierarchy;
}
