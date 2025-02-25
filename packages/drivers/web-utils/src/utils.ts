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
  "*": ["aria-pilot-category", "aria-pilot-index"],
  a: ["href", "target"],
  img: ["src", "alt"],
  input: ["type", "name", "value"],
  meta: ["name", "content"],
  link: ["rel", "href"],
  script: ["src", "type"],
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

    // Process all children
    let childStructure = "";
    for (const child of children) {
      const childStr = processElement(child, depth + 1);
      if (childStr) {
        childStructure += childStr;
      }
    }

    // Determine if current element is important or has important descendants
    const isImportantElement =
      element.hasAttribute("aria-pilot-category") ||
      ESSENTIAL_ELEMENTS.includes(element.tagName);

    if (isImportantElement || childStructure) {
      const category = element.getAttribute("aria-pilot-category");
      const index = element.getAttribute("aria-pilot-index");
      const indent = "  ".repeat(depth);

      structure += `${indent}<${element.tagName.toLowerCase()}`;

      // Add relevant attributes
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
        content: "${category} #" attr(aria-pilot-index);
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

export function removeMarkedElementsHighlights() {
  const style = document.getElementById("aria-pilot-styles");
  style?.remove();
}

if (typeof window !== "undefined") {
  window.createMarkedViewHierarchy = createMarkedViewHierarchy;
}
