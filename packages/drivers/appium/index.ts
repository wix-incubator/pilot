import {
  TestingFrameworkAPICatalog,
  TestingFrameworkDriver,
} from "@wix-pilot/core";
import * as fs from "fs";
import * as path from "path";
export class WebdriverIOAppiumFrameworkDriver
  implements TestingFrameworkDriver
{
  constructor() {}
  /**
   * Attempts to capture the current view hierarchy (source) of the mobile app as XML.
   * If there's no active session or the app isn't running, returns an error message.
   */
  async captureViewHierarchyString(): Promise<string> {
    try {
      // In WebdriverIO + Appium, you can retrieve the current page source (UI hierarchy) via:
      // https://webdriver.io/docs/api/browser/getPageSource (driver is an alias for browser)
      const pageSource = await driver.getPageSource();
      return pageSource;
    } catch (_error) {
      return "NO ACTIVE APP FOUND, LAUNCH THE APP TO SEE THE VIEW HIERARCHY";
    }
  }

  /**
   * Captures a screenshot of the current device screen and saves it to a temp directory.
   * Returns the path to the saved screenshot if successful, or undefined otherwise.
   */
  async captureSnapshotImage(): Promise<string | undefined> {
    const tempDir = "temp";
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const fileName = `snapshot_wdio_${Date.now()}.png`;
    const filePath = path.join(tempDir, fileName);

    try {
      // In WebdriverIO + Appium, driver.takeScreenshot() returns a base64-encoded PNG
      // https://webdriver.io/docs/api/browser/takeScreenshot
      const base64Image = await driver.takeScreenshot();
      const buffer = Buffer.from(base64Image, "base64");
      fs.writeFileSync(filePath, buffer);
      return filePath;
    } catch (_error) {
      console.log(_error);
      return undefined;
    }
  }

  /**
   * Returns the API catalog describing the testing capabilities
   * (matchers, actions, assertions, device/system APIs, etc.)
   */
  get apiCatalog(): TestingFrameworkAPICatalog {
    return {
      name: "WebdriverIO + Appium",
      description:
        "WebdriverIO is a browser and mobile automation library; Appium is a cross-platform automation framework for native, hybrid, and mobile web apps.",
      context: {
        $$: $$,
        $: $,
        driver: driver,
        expect: expect,
      },
      categories: [
        {
          title: "Native Matchers",
          items: [
            {
              signature: `$('~accessibilityId')`,
              description:
                "Locate an element by its accessibility ID (commonly used in Appium).",
              example: `const loginButton = await $('~loginButton'); // Accessibility ID`,
            },
            {
              signature: `$('android=uiSelector')`,
              description:
                "Locate an element using an Android UIAutomator selector.",
              example: `const el = await $('android=new UiSelector().text("Login")');`,
            },
            {
              signature: `$('ios=predicateString')`,
              description: "Locate an element using an iOS NSPredicate string.",
              example: `const el = await $('ios=predicate string:type == "XCUIElementTypeButton" AND name == "Login"');`,
            },
            {
              signature: `$$('#elementSelector')`,
              description: "Locate all elements with a given selector",
              example: `const firstSite = await $$('#Site')[index];`,
            },
            {
              signature: `$('//*[@text="Login"]')`,
              description: "Locate an element using an XPath expression.",
              example: `const el = await $('//*[@text="Login"]');`,
            },
            {
              signature: `$('#elementId'), $('elementTag'), $('.className')`,
              description:
                "Web-like selectors (useful if your app is a hybrid or has a web context).",
              example: `const el = await $('.someNativeClass');`,
            },
          ],
        },
        {
          title: "Native Actions",
          items: [
            {
              signature: `.click()`,
              description: "Clicks (taps) an element.",
              example: `
              await (await $('~loginButton')).waitForEnabled();
              await (await $('~loginButton')).click();`,
            },
            {
              signature: `.setValue(value: string)`,
              description:
                "Sets the value of an input/field (replaces existing text).",
              example: `await (await $('~usernameInput')).setValue('myusername');`,
            },
            {
              signature: `.addValue(value: string)`,
              description: "Adds text to the existing text in the input/field.",
              example: `await (await $('~commentsField')).addValue(' - Additional note');`,
            },
            {
              signature: `.clearValue()`,
              description: "Clears the current value of an input/field.",
              example: `await (await $('~usernameInput')).clearValue();`,
            },
            {
              signature: `.touchAction(actions)`,
              description:
                "Performs a series of touch actions (tap, press, moveTo, release, etc.).",
              example: `
await (await $('~dragHandle')).touchAction([
  { action: 'press', x: 10, y: 10 },
  { action: 'moveTo', x: 10, y: 100 },
  'release'
]);
              `,
            },
            {
              signature: `.scrollIntoView() (web/hybrid context only)`,
              description:
                "Scrolls the element into view (if in a web context).",
              example: `await (await $('#someElement')).scrollIntoView();`,
            },
            {
              signature: `.dragAndDrop(target, duration?)`,
              description:
                "Drags the element to the target location (native or web context).",
              example: `
await (await $('~draggable')).dragAndDrop(
  await $('~dropzone'),
  1000
);
              `,
            },
          ],
        },
        {
          title: "Assertions",
          items: [
            {
              signature: `toBeDisplayed()`,
              description: "Asserts that the element is displayed (visible).",
              example: `await expect(await $('~loginButton')).toBeDisplayed();`,
            },
            {
              signature: `toExist()`,
              description:
                "Asserts that the element exists in the DOM/hierarchy.",
              example: `await expect(await $('~usernameInput')).toExist();`,
            },
            {
              signature: `toHaveText(text: string)`,
              description:
                "Asserts that the element's text matches the given string.",
              example: `await expect(await $('~welcomeMessage')).toHaveText('Welcome, user!');`,
            },
            {
              signature: `toHaveValue(value: string)`,
              description:
                "Asserts that the element's value matches the given string (for inputs, etc.).",
              example: `await expect(await $('~usernameInput')).toHaveValue('myusername');`,
            },
            {
              signature: `toBeEnabled() / toBeDisabled()`,
              description:
                "Asserts that an element is enabled/disabled (if applicable).",
              example: `await expect(await $('~submitButton')).toBeEnabled();`,
            },
            {
              signature: `not`,
              description: "Negates the expectation.",
              example: `await expect(await $('~spinner')).not.toBeDisplayed();`,
            },
          ],
        },
        {
          title: "Device APIs",
          items: [
            {
              signature: `driver.launchApp()`,
              description:
                "Launches the mobile app (if supported by your WebdriverIO config).",
              example: `await driver.launchApp();`,
            },
            {
              signature: `driver.terminateApp(bundleId: string)`,
              description:
                "Terminates the specified app by its bundle/package identifier.",
              example: `await driver.terminateApp('com.example.myapp');`,
              guidelines: [
                "For iOS, use the iOS bundle identifier (e.g. com.mycompany.myapp).",
                "For Android, use the app package name (e.g. com.example.myapp).",
              ],
            },
            {
              signature: `driver.activateApp(bundleId: string)`,
              description: "Brings the specified app to the foreground.",
              example: `await driver.activateApp('com.example.myapp');`,
            },
            {
              signature: `driver.installApp(path: string)`,
              description: "Installs an app from a local path on the device.",
              example: `await driver.installApp('/path/to/app.apk');`,
            },
            {
              signature: `driver.removeApp(bundleId: string)`,
              description:
                "Uninstalls an app by its bundle identifier or package name.",
              example: `await driver.removeApp('com.example.myapp');`,
            },
            {
              signature: `driver.background(seconds: number)`,
              description:
                "Sends the app to the background for a given number of seconds.",
              example: `await driver.background(5); // 5 seconds`,
            },
            {
              signature: `driver.lock(seconds?: number)`,
              description:
                "Locks the device screen for the specified number of seconds (Android only).",
              example: `await driver.lock(10); // lock for 10 seconds`,
            },
            {
              signature: `driver.unlock()`,
              description: "Unlocks the device (Android).",
              example: `await driver.unlock();`,
            },
            {
              signature: `driver.setGeoLocation({ latitude, longitude, altitude })`,
              description: "Sets the device's geolocation.",
              example: `
await driver.setGeoLocation({
  latitude: 37.7749,
  longitude: -122.4194,
  altitude: 10
});
              `,
            },
            {
              signature: `driver.getContext() / driver.switchContext(name: string)`,
              description:
                "Gets or switches the current context (NATIVE_APP or WEBVIEW_xxx).",
              example: `
const contexts = await driver.getContexts();
await driver.switchContext(contexts[1]); // Switch to webview
await driver.switchContext('NATIVE_APP'); // Switch back
              `,
            },
            {
              signature: `driver.rotate(params: { x: number; y: number; duration: number; radius: number; rotation: number; touchCount: number })`,
              description:
                "Simulates a rotation gesture on the device (iOS only).",
              example: `
await driver.rotate({
  x: 100,
  y: 100,
  duration: 2,
  radius: 50,
  rotation: 180,
  touchCount: 2
});
              `,
            },
          ],
        },
        {
          title: "System APIs (iOS / Android)",
          items: [
            {
              signature: `driver.sendSms(phoneNumber: string, message: string) (Android)`,
              description: "Sends an SMS message (Android only).",
              example: `await driver.sendSms('555-1234', 'Test message');`,
            },
            {
              signature: `driver.performTouchAction(action: TouchAction) (Android / iOS)`,
              description:
                "Performs a chain of touch actions (similar to `.touchAction()`, but more low-level).",
              example: `
await driver.performTouchAction({
  actions: [
    { action: 'press', x: 200, y: 200 },
    { action: 'moveTo', x: 200, y: 500 },
    { action: 'release' }
  ]
});
              `,
            },
            {
              signature: `driver.openNotifications() (Android)`,
              description: "Opens the notification shade on Android.",
              example: `await driver.openNotifications();`,
            },
            {
              signature: `driver.toggleAirplaneMode() (Android)`,
              description: "Toggles the Airplane mode on an Android device.",
              example: `await driver.toggleAirplaneMode();`,
            },
          ],
        },
        {
          title: "Web APIs (Hybrid / Mobile Web)",
          items: [
            {
              signature: `driver.switchContext('WEBVIEW')`,
              description:
                "Switches the context from native to web view (if a webview is present).",
              example: `
const contexts = await driver.getContexts();
await driver.switchContext(contexts.find(c => c.includes('WEBVIEW')));
              `,
              guidelines: [
                "Use this when your app has a webview or is a hybrid app.",
              ],
            },
            {
              signature: `$('css or xpath').click()`,
              description:
                "In a webview context, click (tap) a web element using CSS or XPath.",
              example: `await (await $('button#login')).click();`,
            },
            {
              signature: `$('selector').setValue('text')`,
              description:
                "In a webview context, sets text in a web input field.",
              example: `await (await $('input#username')).setValue('myusername');`,
            },
            {
              signature: `.getText()`,
              description:
                "Retrieves the visible text of a web element (hybrid/web context).",
              example: `
const text = await (await $('h1.main-title')).getText();
expect(text).toBe('Welcome to My App');
              `,
            },
            {
              signature: `driver.executeScript(script: string, args?: any[])`,
              description: "Executes JavaScript in the context of the webview.",
              example: `
await driver.executeScript("document.getElementById('hidden-button').click()");
const title = await driver.executeScript('return document.title');
expect(title).toBe('My Page Title');
              `,
            },
          ],
        },
      ],
    };
  }
}
