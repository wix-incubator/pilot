/**
 * Interface for a page object that supports DOM evaluation and waiting
 */
export interface PageWithEvaluate {
  evaluate<T = any>(
    pageFunction: string | ((...args: any[]) => T | Promise<T>),
    ...args: any[]
  ): Promise<T>;
  waitForSelector(selector: string, options?: any): Promise<any>;
}

/**
 * Get clean DOM from the page content
 * - Removes hidden elements
 * - Removes ads, analytics, tracking elements
 * - Removes unnecessary attributes
 * - Removes empty elements
 * @param page - A page object that supports evaluate and waitForSelector methods
 */
export default async function getCleanDOM(page: PageWithEvaluate) {
  await page.waitForSelector("body");

  return await page.evaluate(() => {
    const copiedDocument = document.cloneNode(true) as Document;

    copiedDocument
      .querySelectorAll('[hidden], [aria-hidden="true"]')
      .forEach((el) => el.remove());

    const removeSelectors = [
      "script",
      "style",
      "link",
      "meta",
      "noscript",
      "iframe",
      '[class*="ads"]',
      '[id*="ads"]',
      '[class*="analytics"]',
      '[class*="tracking"]',
      "footer",
      "header",
      "nav",
      "path",
      "aside",
    ];

    const allowedAttributes = [
      "src",
      "href",
      "alt",
      "title",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "aria-hidden",
      "role",
      "class",
      "id",
      "data-*",
    ];

    copiedDocument.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (!allowedAttributes.includes(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });

      if (!el.innerHTML.trim()) {
        el.remove();
      }
    });

    removeSelectors.forEach((selector) => {
      copiedDocument.querySelectorAll(selector).forEach((el) => el.remove());
    });

    const mainContent = copiedDocument.body.innerHTML;
    return mainContent.replace(/\s+/g, " ").trim();
  });
}
