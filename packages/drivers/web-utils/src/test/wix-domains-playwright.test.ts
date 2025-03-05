import {
  TestContext,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "./setup";
import { Page as PlaywrightPage } from "playwright";
import WebTestingFrameworkDriverHelper from "../index";

describe("Wix Domains Page Testing", () => {
  let testContext: TestContext;
  let page: PlaywrightPage;
  const driverUtils: WebTestingFrameworkDriverHelper =
    new WebTestingFrameworkDriverHelper();

  beforeAll(async () => {
    testContext = await setupTestEnvironment("wix-domains.html", "playwright");
    page = testContext.page as PlaywrightPage;
  }, 30000);

  afterAll(async () => {
    await teardownTestEnvironment(testContext);
  });

  beforeEach(async () => {
    await driverUtils.removeMarkedElementsHighlights(page);
  });

  it("should match the screenshot against the baseline image", async () => {
    await driverUtils.markImportantElements(page);
    await driverUtils.highlightMarkedElements(page);
    await page.setViewportSize({ width: 800, height: 600 });
    await page.addStyleTag({
      content: `
        * {
          animation: none !important;
          transition: none !important;
          will-change: auto !important;
        }
      `,
    });
    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: "wix-domains-playwright-desktop",
      failureThreshold: 0.1,
      failureThresholdType: "percent",
    });
  });

  it("should generate the expected clean view structure", async () => {
    await driverUtils.markImportantElements(page);
    const structure = await driverUtils.createMarkedViewHierarchy(page);
    expect(structure).toMatchSnapshot("wix-domains-clean-view-structure");
  });
  it("should find the element with the lowest error based on a simple aria-label criteria", async () => {
    await page.evaluate(() => {
      if (!document.querySelector('[aria-label="TestButton"]')) {
        const testButton = document.createElement("button");
        testButton.setAttribute("aria-label", "TestButton");
        testButton.textContent = "Test Button";
        document.body.appendChild(testButton);
      }
    });

    const elementHandle = await page.evaluateHandle(() => {
      return window.findElement({
        "aria-label": "TestButton",
      });
    });

    const ariaLabel = await elementHandle.asElement()?.evaluate((el) => {
      return (el as HTMLElement).getAttribute("aria-label");
    });
    expect(ariaLabel).toBe("TestButton");
  });

  it("should find the complex button using multiple attributes (excluding aria-label)", async () => {
    await page.evaluate(() => {
      if (!document.querySelector('[data-testid="complexTestId"]')) {
        const btn = document.createElement("button");
        btn.setAttribute("aria-role", "button");
        btn.className = "complex-button";
        btn.setAttribute("data-testid", "complexTestId");
        btn.setAttribute("name", "complexName");
        btn.setAttribute("title", "complexTitle");
        btn.setAttribute("placeholder", "complexPlaceholder");
        btn.textContent = "Complex Button";
        document.body.appendChild(btn);
      }
    });

    const criteria = {
      "aria-role": "button",
      class: "complex-button",
      id: "complexTestId",
      name: "complexName",
      title: "complexTitle",
      placeholder: "complexPlaceholder",
    };
    const foundElementData = await page.evaluate((criteria) => {
      const el = window.findElement(criteria);
      if (!el) return null;
      return {
        ariaRole: el.getAttribute("aria-role") || el.getAttribute("role"),
        className: el.className,
        testid: el.getAttribute("data-testid"),
        name: el.getAttribute("name"),
        title: el.getAttribute("title"),
        placeholder: el.getAttribute("placeholder"),
      };
    }, criteria);

    expect(foundElementData).toEqual({
      ariaRole: "button",
      className: "complex-button",
      testid: "complexTestId",
      name: "complexName",
      title: "complexTitle",
      placeholder: "complexPlaceholder",
    });
  });

  it("should find a specific element among a large number of elements using multiple attributes", async () => {
    await page.evaluate(() => {
      // Create 1000 dummy elements with random sizes.
      for (let i = 0; i < 1000; i++) {
        const dummy = document.createElement("div");
        dummy.className = "dummy-element";
        dummy.setAttribute("aria-role", "dummy");
        dummy.setAttribute("data-testid", `dummy-${i}`);
        dummy.setAttribute("name", "dummyName");
        dummy.setAttribute("title", "dummyTitle");
        dummy.setAttribute("placeholder", "dummyPlaceholder");
        dummy.textContent = `Dummy Element ${i}`;
        dummy.style.width = Math.floor(Math.random() * 200 + 50) + "px";
        dummy.style.height = Math.floor(Math.random() * 200 + 50) + "px";
        document.body.appendChild(dummy);
      }

      // Create the special element with random sizes.
      const special = document.createElement("button");
      special.setAttribute("aria-role", "special");
      special.className = "special-element";
      special.setAttribute("data-testid", "special123");
      special.setAttribute("name", "specialName");
      special.setAttribute("title", "specialTitle");
      special.setAttribute("placeholder", "specialPlaceholder");
      special.textContent = "Special Element";
      special.style.width = Math.floor(Math.random() * 200 + 50) + "px";
      special.style.height = Math.floor(Math.random() * 200 + 50) + "px";
      document.body.appendChild(special);
    });

    const criteria = {
      "aria-role": "special",
      class: "special-element",
      id: "special123",
      name: "specialName",
      title: "specialTitle",
      placeholder: "specialPlaceholder",
    };

    const foundSpecialElementData = await page.evaluate((criteria) => {
      const el = window.findElement(criteria);
      if (!el) return null;
      return {
        ariaRole: el.getAttribute("aria-role") || el.getAttribute("role"),
        className: el.className,
        testid: el.getAttribute("data-testid"),
        name: el.getAttribute("name"),
        title: el.getAttribute("title"),
        placeholder: el.getAttribute("placeholder"),
      };
    }, criteria);

    expect(foundSpecialElementData).toEqual({
      ariaRole: "special",
      className: "special-element",
      testid: "special123",
      name: "specialName",
      title: "specialTitle",
      placeholder: "specialPlaceholder",
    });
  });
});
