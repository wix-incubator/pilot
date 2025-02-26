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

      // Preserve all aria-* attributes and essential attributes
      Array.from(element.attributes)
        .filter(
          (attr) =>
            attr.name.match(/^aria-/i) || // all aria-* attributes
            ["href", "target", "src", "alt", "type", "name", "value", "role"].includes(
              attr.name.toLowerCase(),
            ),
        )
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
  const containerId = "aria-pilot-overlay-container";

  // Remove old styles and container if they exist
  const oldStyle = document.getElementById(styleId);
  const oldContainer = document.getElementById(containerId);
  oldStyle?.remove();
  oldContainer?.remove();

  // Create overlay container for labels
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

  // Create style element
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

  // Create labels for each marked element
  const elements = document.querySelectorAll("[aria-pilot-category]");
  elements.forEach((el) => {
    const category = el.getAttribute("aria-pilot-category");
    const index = el.getAttribute("aria-pilot-index");
    if (!category || !index) return;

    const label = document.createElement("div");
    label.className = "aria-pilot-label";
    label.dataset.category = category;
    label.textContent = `${category} #${index}`;

    // Position label relative to element
    const rect = el.getBoundingClientRect();
    Object.assign(label.style, {
      left: `${rect.left + window.scrollX}px`,
      top: `${rect.top + window.scrollY}px`,
    });

    container.appendChild(label);

    // Update label position on scroll and resize
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
