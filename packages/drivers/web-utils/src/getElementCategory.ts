import { ElementCategory } from "./types";

const roleToCategory: Record<string, ElementCategory> = {
  // Interactive roles
  button: "button",
  checkbox: "input",
  radio: "input",
  switch: "input",
  link: "link",
  textbox: "input",
  searchbox: "input",
  combobox: "input",
  listbox: "input",
  slider: "input",
  spinbutton: "input",

  // Structural roles
  list: "list",
  listitem: "list",
  table: "table",
  grid: "table",
  treegrid: "table",
  columnheader: "table",
  rowheader: "table",
  heading: "header",

  // Semantic/landmark roles
  article: "semantic",
  navigation: "semantic",
  banner: "semantic",
  complementary: "semantic",
  contentinfo: "semantic",
  main: "semantic",
  region: "semantic",
  form: "semantic",
  search: "semantic",
};

const tagToCategory: Record<
  string,
  ElementCategory | ((el: Element) => ElementCategory | undefined)
> = {
  // Interactive elements
  button: "button",
  a: (el) => (el.hasAttribute("href") ? "link" : undefined),
  input: "input",
  select: "input",
  textarea: "input",

  // Structural elements
  ul: (el) => (hasListChildren(el) ? "list" : undefined),
  ol: (el) => (hasListChildren(el) ? "list" : undefined),
  table: (el) => (hasTableStructure(el) ? "table" : undefined),
  img: (el) => (isInteractiveSemantic(el) ? "button" : undefined),

  // Headers
  h1: "header",
  h2: "header",
  h3: "header",
  h4: "header",
  h5: "header",
  h6: "header",

  // Semantic HTML5 elements
  article: "semantic",
  aside: "semantic",
  footer: "semantic",
  header: "semantic",
  main: "semantic",
  nav: "semantic",
  section: "semantic",
  form: "semantic",
  search: "semantic",
  span: (el) => (isInteractiveSemantic(el) ? "button" : undefined),
  div: (el) => (isInteractiveSemantic(el) ? "button" : undefined),
};

export const tags = Object.keys(tagToCategory);

function hasPointerCursor(
  element: HTMLElement,
  simulateHover: boolean = true,
): boolean {
  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.cursor === "pointer") {
    return true;
  }
  if (simulateHover) {
    const originalClasses = element.className;
    const hoverClass = "simulated-hover";
    element.classList.add(hoverClass);
    const hoverStyle = window.getComputedStyle(element);
    const hasPointerOnHover = hoverStyle.cursor === "pointer";
    element.className = originalClasses;
    return hasPointerOnHover;
  }
  return false;
}

function getElementCategory(
  el: Element,
  simulateHover: boolean = false,
): ElementCategory | undefined {
  const role = el.getAttribute("role")?.toLowerCase();
  if (role && roleToCategory[role]) {
    return roleToCategory[role];
  }

  const tag = el.tagName.toLowerCase();
  const categoryResolver = tagToCategory[tag];
  const _isScrollable = isScrollable(el);

  if (typeof categoryResolver === "function") {
    const category = categoryResolver(el);
    if (category) {
      return category;
    }
  } else if (categoryResolver) {
    return categoryResolver;
  }

  if (el instanceof HTMLElement && hasPointerCursor(el, simulateHover)) {
    return "button";
  }

  return isCustomInteractiveElement(el)
    ? "button"
    : _isScrollable
      ? "scrollable"
      : undefined;
}

/** Heuristic: Only consider interactive semantics */
function isInteractiveSemantic(el: Element): boolean {
  return isCustomInteractiveElement(el);
}

/** Heuristic: Only consider lists with visible children */
function hasListChildren(el: Element): boolean {
  return Array.from(el.children).some((child) => {
    const style = window.getComputedStyle(child);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}
/** Heuristic: Verify table has proper structure */
function hasTableStructure(el: Element): boolean {
  return el.querySelector("thead, tbody, tfoot, tr, td, th") !== null;
}

function isCustomInteractiveElement(el: Element): boolean {
  return (
    el instanceof HTMLElement &&
    (el.tabIndex >= 0 ||
      el.hasAttribute("onclick") ||
      el.getAttribute("role") === "button")
  );
}

function isScrollable(el: Element): boolean {
  const scrollableClasses = ["scrollable", "overflow-auto"];
  for (const className of scrollableClasses) {
    if (el.classList.contains(className)) {
      return true;
    }
  }
  const overflowX = getComputedStyle(el).overflowX;
  const overflowY = getComputedStyle(el).overflowY;
  const isScrollableByStyle =
    overflowX === "scroll" ||
    overflowY === "scroll" ||
    overflowX === "auto" ||
    overflowY === "auto";
  const hasScrollableContent =
    el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
  return isScrollableByStyle && hasScrollableContent;
}

export default getElementCategory;
