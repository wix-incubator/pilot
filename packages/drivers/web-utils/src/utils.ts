import getElementCategory, { tags } from "./getElementCategory";
import isElementHidden from "./isElementHidden";
import { ElementCategory } from "./types";

const DEFAULT_DOM_STABILITY_THRESHOLD = 500; // ms
const DEFAULT_MAX_WAIT_TIMEOUT = 5000; // ms

import { ELEMENT_MATCHING_CONFIG } from "./matchingConfig";
import {
  meetsSufficientCriteria,
  meetsMandatoryCriteria,
  calculateWeightedError,
} from "./criteriaUtils";

type AttributeKey = keyof typeof ELEMENT_MATCHING_CONFIG;
type ElementMatchingCriteria = {
  [K in AttributeKey]?: ReturnType<
    (typeof ELEMENT_MATCHING_CONFIG)[K]["extract"]
  >;
};

declare global {
  interface Window {
    createMarkedViewHierarchy: () => string;
    findElement: (criteria: ElementMatchingCriteria) => HTMLElement | null;
  }
}

/**
 * Retrieves the “interesting” attributes from an element based on the
 * extract functions provided in ELEMENT_MATCHING_CONFIG.
 */
export function getInterestingAttributes(
  element: HTMLElement,
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  for (const key in ELEMENT_MATCHING_CONFIG) {
    const config = ELEMENT_MATCHING_CONFIG[key];
    attributes[key] = config.extract(element);
  }
  return attributes;
}

export function findElement(
  criteria: ElementMatchingCriteria,
): HTMLElement | null {
  const maxErrorThreshold = 0.7;
  const candidates = Array.from(
    document.querySelectorAll("*"),
  ) as HTMLElement[];
  const sufficientCandidate = candidates.find((candidate) =>
    meetsSufficientCriteria(candidate, criteria),
  );
  if (sufficientCandidate) return sufficientCandidate;

  const mandatoryCandidates = candidates.filter((candidate) =>
    meetsMandatoryCriteria(candidate, criteria),
  );
  const bestCandidate = mandatoryCandidates.reduce(
    (best, candidate) => {
      const errorScore = calculateWeightedError(candidate, criteria);
      return errorScore < best.errorScore ? { candidate, errorScore } : best;
    },
    { candidate: null as HTMLElement | null, errorScore: Infinity },
  );

  return bestCandidate.errorScore < maxErrorThreshold
    ? bestCandidate.candidate
    : null;
}

/** Define your category -> color mapping. First item is the primary color, second is the text color. */
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

/**
 * Marks important elements by adding aria-pilot-category and aria-pilot-index.
 */
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
  // Use the live DOM root instead of a detached clone
  const root = document.documentElement;

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
            attr.name.match(/^aria-/i) ||
            ["target", "alt", "type", "name", "value", "role"].includes(
              attr.name.toLowerCase(),
            ),
        )
        .forEach((attr) => {
          structure += ` ${attr.name}="${attr.value}"`;
        });
      const interestingAttrs = getInterestingAttributes(element as HTMLElement);
      for (const [attr, value] of Object.entries(interestingAttrs)) {
        if (value != null && value !== "") {
          structure += ` ${attr}=${JSON.stringify(value)}`;
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

  return processElement(root);
}

/** Helper to check if two rectangles overlap. */
function isOverlapping(r1: DOMRect, r2: DOMRect): boolean {
  return !(
    r1.right < r2.left ||
    r1.left > r2.right ||
    r1.bottom < r2.top ||
    r1.top > r2.bottom
  );
}

/** Returns [centerX, centerY] of a DOMRect. */
function getRectCenter(r: DOMRect): [number, number] {
  return [r.left + r.width / 2, r.top + r.height / 2];
}

/** Euclidean distance between two points. */
function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Data structure for a label + the bounding box of the element that created it.
 */
interface LabeledItem {
  label: HTMLElement;
  elementRect: DOMRect;
}

/**
 * For any two overlapping labels, keep whichever label is “closer” to its
 * own element’s center, remove the other.
 */
function removeCloseLabels(labeledItems: LabeledItem[]): void {
  for (let i = 0; i < labeledItems.length; i++) {
    const itemA = labeledItems[i];
    if (!itemA) continue;

    const labelA = itemA.label;
    const rectA = labelA.getBoundingClientRect();
    const [cxA, cyA] = getRectCenter(rectA);
    const [exA, eyA] = getRectCenter(itemA.elementRect);
    const distA = distance(cxA, cyA, exA, eyA);

    for (let j = i + 1; j < labeledItems.length; j++) {
      const itemB = labeledItems[j];
      if (!itemB) continue;

      const labelB = itemB.label;
      const rectB = labelB.getBoundingClientRect();

      if (isOverlapping(rectA, rectB)) {
        // Compare distance to each label's own element center
        const [cxB, cyB] = getRectCenter(rectB);
        const [exB, eyB] = getRectCenter(itemB.elementRect);
        const distB = distance(cxB, cyB, exB, eyB);

        if (distA < distB) {
          // itemA wins, remove itemB
          labelB.remove();
          labeledItems.splice(j, 1);
          j--;
        } else {
          // itemB wins, remove itemA
          labelA.remove();
          labeledItems.splice(i, 1);
          i--;
          break;
        }
      }
    }
  }
}

/**
 * Highlights all elements that have aria-pilot-category by drawing outlines
 * and labels in an external overlay. After placing all labels, overlapping
 * labels are removed using the removeCloseLabels function.
 */
export function highlightMarkedElements() {
  const overlayId = "aria-pilot-outline-overlay";

  // Remove any existing overlay.
  const oldOverlay = document.getElementById(overlayId);
  if (oldOverlay) {
    oldOverlay.remove();
  }

  // Create a top-level overlay container.
  const overlay = document.createElement("div");
  overlay.id = overlayId;
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  document.body.appendChild(overlay);

  // We'll store label items here to later remove overlapping labels.
  const labeledItems: LabeledItem[] = [];

  // For each element marked with aria-pilot-category, draw an outline and a label.
  const elements = document.querySelectorAll("[aria-pilot-category]");
  elements.forEach((el) => {
    const category = el.getAttribute("aria-pilot-category");
    const index = el.getAttribute("aria-pilot-index");
    if (!category || !index) return;
    const rect = el.getBoundingClientRect();
    const [primaryColor, textColor] = CATEGORY_COLORS[
      category as ElementCategory
    ] || ["#000000", "#ffffff"];

    // Create an outline rectangle.
    const outlineDiv = document.createElement("div");
    Object.assign(outlineDiv.style, {
      position: "absolute",
      left: rect.left + window.scrollX + "px",
      top: rect.top + window.scrollY + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      border: `2px solid ${primaryColor}`,
      boxSizing: "border-box",
      pointerEvents: "none",
      zIndex: "2147483647",
    });
    overlay.appendChild(outlineDiv);

    // Create a label above the element.
    const label = document.createElement("div");
    label.className = "aria-pilot-label";
    label.dataset.category = category;
    label.textContent = `${category} #${index}`;
    Object.assign(label.style, {
      position: "absolute",
      left: rect.left + window.scrollX + "px",
      top: rect.top + window.scrollY - 20 + "px", // label above the element
      background: `${primaryColor}CC`,
      color: textColor,
      font: "10px monospace",
      padding: "2px 4px",
      borderRadius: "2px",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: "2147483647",
    });
    overlay.appendChild(label);

    // Store the label and the original element's bounding box.
    labeledItems.push({ label, elementRect: rect });

    // Update positions on scroll/resize.
    const updatePosition = () => {
      const newRect = el.getBoundingClientRect();
      Object.assign(outlineDiv.style, {
        left: newRect.left + window.scrollX + "px",
        top: newRect.top + window.scrollY + "px",
        width: newRect.width + "px",
        height: newRect.height + "px",
      });
      Object.assign(label.style, {
        left: newRect.left + window.scrollX + "px",
        top: newRect.top + window.scrollY - 20 + "px",
      });
      // Also update the stored elementRect.
      item.elementRect = newRect;
    };
    // We'll use a closure variable to reference this label item.
    const item = labeledItems[labeledItems.length - 1];
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });
  });

  // Remove overlapping labels based on closeness to each element’s center.
  removeCloseLabels(labeledItems);
}

export function removeMarkedElementsHighlights() {
  // Remove the overlay container if it exists.
  document.getElementById("aria-pilot-outline-overlay")?.remove();
}

export function waitForStableDOM(
  stabilityThreshold: number = DEFAULT_DOM_STABILITY_THRESHOLD,
  maxWaitTimeout: number = DEFAULT_MAX_WAIT_TIMEOUT,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let stabilityTimer: number | undefined;

    const observer = new MutationObserver(() => {
      if (stabilityTimer !== undefined) {
        clearTimeout(stabilityTimer);
      }
      stabilityTimer = window.setTimeout(() => {
        observer.disconnect();
        resolve();
      }, stabilityThreshold);
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, maxWaitTimeout);
  });
}

if (typeof window !== "undefined") {
  window.createMarkedViewHierarchy = createMarkedViewHierarchy;
  window.findElement = findElement;
}
