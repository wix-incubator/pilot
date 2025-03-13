import getElementCategory, { tags } from "./getElementCategory";
import isElementHidden from "./isElementHidden";
import { ElementCategory, HighlightItem, CandidateToBeMarked } from "./types";
const DEFAULT_DOM_STABILITY_THRESHOLD = 500; // ms
const DEFAULT_MAX_WAIT_TIMEOUT = 5000; // ms
import { ELEMENT_MATCHING_CONFIG } from "./matchingConfig";
import {
  meetsSufficientCriteria,
  meetsMandatoryCriteria,
  calculateWeightedError,
} from "./criteriaUtils";
import { getZIndex, removeOverlappingBoxes } from "./domUtils";

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

// -------------------------------------------------------
//  Basic Utility Helpers
// -------------------------------------------------------
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

// -------------------------------------------------------
//  Finding elements by criteria
// -------------------------------------------------------
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

// -------------------------------------------------------
//  Marking logic
// -------------------------------------------------------
const ESSENTIAL_ELEMENTS = ["HTML", "HEAD", "BODY"];

/** Define category -> color mapping ([outlineColor, labelTextColor]). */
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

/**
 * If multiple elements share the same category AND their centers are “close,”
 * choose the candidate with the smallest bounding box (area). In case of ties,
 * the one with the lower z-index wins.
 */
export function markImportantElements(options?: { includeHidden?: boolean }) {
  const selector = tags.join(",");
  const elements = Array.from(
    document.querySelectorAll(selector),
  ) as HTMLElement[];

  const candidates: CandidateToBeMarked[] = [];

  for (const el of elements) {
    if (!options?.includeHidden && isElementHidden(el)) {
      continue;
    }
    const category = getElementCategory(el);
    if (!category) continue;

    const rect = el.getBoundingClientRect();
    const center: [number, number] = [
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    ];
    const zIndex = getZIndex(el);
    const area = rect.width * rect.height;

    candidates.push({ element: el, category, center, zIndex, area });
  }

  const byCategory = new Map<ElementCategory, CandidateToBeMarked[]>();
  for (const c of candidates) {
    if (!byCategory.has(c.category)) {
      byCategory.set(c.category, []);
    }
    byCategory.get(c.category)!.push(c);
  }

  const CENTER_DISTANCE_THRESHOLD = 10;
  const winners: CandidateToBeMarked[] = [];

  for (const group of byCategory.values()) {
    const clusters: CandidateToBeMarked[][] = [];

    for (const candidate of group) {
      let placed = false;
      for (const cluster of clusters) {
        const clusterCenter = cluster[0].center;
        const dist = Math.sqrt(
          (candidate.center[0] - clusterCenter[0]) ** 2 +
            (candidate.center[1] - clusterCenter[1]) ** 2,
        );
        if (dist < CENTER_DISTANCE_THRESHOLD) {
          cluster.push(candidate);
          placed = true;
          break;
        }
      }
      if (!placed) {
        clusters.push([candidate]);
      }
    }

    // For each cluster, choose the candidate with the smallest area.
    // If two candidates have the same area, choose the one with the lower z-index.
    for (const cluster of clusters) {
      let best = cluster[0];
      for (const c of cluster) {
        if (c.area < best.area) {
          best = c;
        } else if (c.area === best.area && c.zIndex < best.zIndex) {
          best = c;
        }
      }
      winners.push(best);
    }
  }

  const categoryCounts = new Map<ElementCategory, number>();
  for (const w of winners) {
    const count = categoryCounts.get(w.category) ?? 0;
    w.element.setAttribute("aria-pilot-category", w.category);
    w.element.setAttribute("aria-pilot-index", String(count));
    categoryCounts.set(w.category, count + 1);
  }
}

// -------------------------------------------------------
//  Hierarchical View
// -------------------------------------------------------
export function createMarkedViewHierarchy() {
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

/**
 * Highlights all elements that have aria-pilot-category by drawing
 * bounding boxes & labels in an external overlay using the element's full size.
 * Then removes partially overlapping bounding boxes (only if the overlap is at least 40%),
 */
export function highlightMarkedElements() {
  const overlayId = "aria-pilot-outline-overlay";

  const oldOverlay = document.getElementById(overlayId);
  if (oldOverlay) {
    oldOverlay.remove();
  }

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

  const highlightItems: HighlightItem[] = [];
  const elements = document.querySelectorAll("[aria-pilot-category]");
  elements.forEach((el) => {
    const category = el.getAttribute("aria-pilot-category");
    const index = el.getAttribute("aria-pilot-index");
    if (!category || !index) return;

    const rect = el.getBoundingClientRect();
    const [primaryColor, textColor] = CATEGORY_COLORS[
      category as ElementCategory
    ] || ["#000000", "#ffffff"];

    const left = rect.left + window.scrollX;
    const top = rect.top + window.scrollY;
    const width = rect.width;
    const height = rect.height;

    const outlineDiv = document.createElement("div");
    Object.assign(outlineDiv.style, {
      position: "absolute",
      left: left + "px",
      top: top + "px",
      width: width + "px",
      height: height + "px",
      border: `2px solid ${primaryColor}`,
      boxSizing: "border-box",
      pointerEvents: "none",
      zIndex: "2147483647",
    });
    overlay.appendChild(outlineDiv);

    const label = document.createElement("div");
    label.className = "aria-pilot-label";
    label.dataset.category = category;
    label.textContent = `${category} #${index}`;
    Object.assign(label.style, {
      position: "absolute",
      left: left + "px",
      top: "0px",
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

    const labelHeight = label.offsetHeight;
    label.style.top = top - labelHeight + "px";

    const boundingRect = new DOMRect(left, top, width, height);
    const zIndex = getZIndex(el as HTMLElement);
    highlightItems.push({ outlineDiv, label, boundingRect, zIndex });

    const updatePosition = () => {
      const newRect = el.getBoundingClientRect();
      const newLeft = newRect.left + window.scrollX;
      const newTop = newRect.top + window.scrollY;
      const newWidth = newRect.width;
      const newHeight = newRect.height;

      Object.assign(outlineDiv.style, {
        left: newLeft + "px",
        top: newTop + "px",
        width: newWidth + "px",
        height: newHeight + "px",
      });

      const currentLabelHeight = label.offsetHeight;
      label.style.left = newLeft + "px";
      label.style.top = newTop - currentLabelHeight + "px";

      const updatedRect = new DOMRect(newLeft, newTop, newWidth, newHeight);
      const highlightItem = highlightItems.find((h) => h.label === label);
      if (highlightItem) {
        highlightItem.boundingRect = updatedRect;
      }
    };

    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });
  });

  removeOverlappingBoxes(highlightItems);
}

/**
 * Removes the highlight overlay container if it exists.
 */
export function removeMarkedElementsHighlights() {
  document.getElementById("aria-pilot-outline-overlay")?.remove();
}

// -------------------------------------------------------
//  Waiting for a stable DOM
// -------------------------------------------------------
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

// -------------------------------------------------------
//  Attach our methods to window (optional)
// -------------------------------------------------------
if (typeof window !== "undefined") {
  window.createMarkedViewHierarchy = createMarkedViewHierarchy;
  window.findElement = findElement;
}
