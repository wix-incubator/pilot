import type { HighlightItem } from "./types";
const OVERLAP_THRESHOLD = 0.3;

export function getZIndex(el: HTMLElement): number {
  const zStr = window.getComputedStyle(el).zIndex;
  const zVal = parseInt(zStr, 10);
  return Number.isNaN(zVal) ? 0 : zVal;
}

function isOverlapping(r1: DOMRect, r2: DOMRect): boolean {
  return !(
    r1.right < r2.left ||
    r1.left > r2.right ||
    r1.bottom < r2.top ||
    r1.top > r2.bottom
  );
}

function isContained(r1: DOMRect, r2: DOMRect): boolean {
  return (
    r1.left >= r2.left &&
    r1.right <= r2.right &&
    r1.top >= r2.top &&
    r1.bottom <= r2.bottom
  );
}

function getIntersectionArea(r1: DOMRect, r2: DOMRect): number {
  const xOverlap = Math.max(
    0,
    Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left),
  );
  const yOverlap = Math.max(
    0,
    Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top),
  );
  return xOverlap * yOverlap;
}

/**
 * Removes highlights that partially overlap each other, but only if the
 * overlapping (intersection) area is at least 30% of one of the boxes.
 * In that case, the box with the larger area is removed.
 * If one box is fully contained within the other, both are kept.
 */
export function removeOverlappingBoxes(highlights: HighlightItem[]) {
  for (let i = 0; i < highlights.length; i++) {
    const h1 = highlights[i];
    if (!h1) continue;

    for (let j = i + 1; j < highlights.length; j++) {
      const h2 = highlights[j];
      if (!h2) continue;

      if (isOverlapping(h1.boundingRect, h2.boundingRect)) {
        const contained12 = isContained(h1.boundingRect, h2.boundingRect);
        const contained21 = isContained(h2.boundingRect, h1.boundingRect);

        if (contained12 || contained21) {
          continue;
        } else {
          const interArea = getIntersectionArea(
            h1.boundingRect,
            h2.boundingRect,
          );
          const area1 = h1.boundingRect.width * h1.boundingRect.height;
          const area2 = h2.boundingRect.width * h2.boundingRect.height;
          const overlapRatio1 = interArea / area1;
          const overlapRatio2 = interArea / area2;

          if (
            overlapRatio1 < OVERLAP_THRESHOLD &&
            overlapRatio2 < OVERLAP_THRESHOLD
          ) {
            continue;
          }
          if (area1 <= area2) {
            h2.outlineDiv.remove();
            h2.label.remove();
            highlights.splice(j, 1);
            j--;
          } else {
            h1.outlineDiv.remove();
            h1.label.remove();
            highlights.splice(i, 1);
            i--;
            break;
          }
        }
      }
    }
  }
}
