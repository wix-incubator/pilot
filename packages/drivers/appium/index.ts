import {
  TestingFrameworkAPICatalog,
  TestingFrameworkDriver,
  TestingFrameworkDriverConfig,
} from "@wix-pilot/core";
import { writeFileSync } from "fs";
import * as fs from "fs";
import * as path from "path";
import { waitForStableState } from "./utils/getStableViewHierarchy";
import os from "os";
import { getTextCoordinates } from "./utils/getTextCoordinates";

export class WebdriverIOAppiumFrameworkDriver
  implements TestingFrameworkDriver
{
  constructor() {}

  /**
   * Additional driver configuration.
   *
   * @property useSnapshotStabilitySync - Indicates whether the driver should use wait for screen stability.
   */
  get driverConfig(): TestingFrameworkDriverConfig {
    return { useSnapshotStabilitySync: true };
  }
  /**
   * Attempts to capture the current view hierarchy (source) of the mobile app as XML.
   * If there's no active session or the app isn't running, returns an error message.
   */
  async captureViewHierarchyString(): Promise<string> {
    try {
      const result = await waitForStableState();
      return result ?? "";
    } catch (_error) {
      return "NO ACTIVE APP FOUND, LAUNCH THE APP TO SEE THE VIEW HIERARCHY";
    }
  }

  /**
   * Captures a screenshot of the current device screen and saves it to a temp directory.
   * Returns the path to the saved screenshot if successful, or undefined otherwise.
   */
  async captureSnapshotImage(_: boolean): Promise<string | undefined> {
    const tempDir = path.resolve(os.tmpdir(), "pilot-snapshot");
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
        findTextLocation: async (word: string) => {
          const base64Image = await driver.takeScreenshot();
          if (!base64Image) throw new Error("Failed to capture screenshot");

          const tempImagePath = path.join(__dirname, "temp_screenshot.png");
          writeFileSync(tempImagePath, base64Image, { encoding: "base64" });

          const screenSize = await driver.getWindowSize();
          const rawPoints = await getTextCoordinates(tempImagePath, word);

          return rawPoints.map(({ x, y }) => ({
            x: x * screenSize.width,
            y: y * screenSize.height,
          }));
        },
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
              guidelines: [
                "Always prefer using test IDs when available; if no ID is present, use another stable identifier.",
              ],
            },
            {
              signature: `$('android=uiSelector')`,
              description:
                "Locate an element using an Android UIAutomator selector.",
              example: `const el = await $('android=new UiSelector().text("Login")');`,
              guidelines: [
                "For Android, use UIAutomator selectors to target elements by text, resource-id, or other properties. Ensure selectors are precise to avoid ambiguity.",
              ],
            },
            {
              signature: `$('ios=predicateString')`,
              description: "Locate an element using an iOS NSPredicate string.",
              example: `const el = await $('ios=predicate string:type == "XCUIElementTypeButton" AND name == "Login"');`,
              guidelines: [
                "For iOS, use NSPredicate strings to define clear and concise conditions for element identification. Validate the predicate to ensure it uniquely identifies the element.",
              ],
            },
            {
              signature: `$$('#elementSelector')`,
              description: "Locate all elements with a given selector",
              example: `const firstSite = await $$('#Site')[index];`,
              guidelines: [
                "Use this to select multiple elements. Make sure your selector targets a specific subset of elements to avoid excessive matches.",
              ],
            },
            {
              signature: `$('//*[@text="Login"]')`,
              description: "Locate an element using an XPath expression.",
              example: `const el = await $('//*[@text="Login"]');`,
              guidelines: [
                "Use XPath as a last resort when other selectors are not available, as XPath can be slower and more brittle. Ensure your XPath expression is optimized for performance.",
              ],
            },
            {
              signature: `$('#elementId'), $('elementTag'), $('.className')`,
              description:
                "Web-like selectors (useful if your app is a hybrid or has a web context).",
              example: `const el = await $('.someNativeClass');`,
              guidelines: [
                "Use web-like selectors in hybrid apps or web contexts. Ensure selectors are unique and adhere to best practices for CSS selectors.",
              ],
            },
          ],
        },
        {
          title: "Native Actions",
          items: [
            {
              signature: ".click()",
              description: "Triggers a click (or tap) event on an element.",
              example:
                "// For a button element\nawait (await $('~loginButton')).waitForEnabled();\nawait (await $('~loginButton')).click();\n\n// For a non-button element\nawait (await $('~loginButton')).waitForDisplayed();\nawait (await $('~loginButton')).click();",
              guidelines: [
                "For button elements, always use await (await $('~element')).waitForEnabled() to ensure the element is enabled before clicking.",
              ],
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
              guidelines: [
                "Use this matcher to verify that the element is visible to the user.",
              ],
            },
            {
              signature: `.waitForEnabled()`,
              description:
                "Waits until the element is enabled and ready to be clicked",
              example: `await (await $('~usernameInput')).waitForEnabled();`,
              guidelines: ["Allways use this before clicking on an element"],
            },
            {
              signature: `toExist()`,
              description:
                "Asserts that the element exists in the DOM/hierarchy.",
              example: `await expect(await $('~usernameInput')).toExist();`,
              guidelines: [
                "Use this matcher to check that the element exists in the DOM or view hierarchy.",
              ],
            },
            {
              signature: `toHaveText(text: string)`,
              description:
                "Asserts that the element's text matches the given string.",
              example: `await expect(await $('~welcomeMessage')).toHaveText('Welcome, user!');`,
              guidelines: [
                "Use this matcher to verify the text content of an element exactly matches the expected value.",
              ],
            },
            {
              signature: `toHaveValue(value: string)`,
              description:
                "Asserts that the element's value matches the given string (for inputs, etc.).",
              example: `await expect(await $('~usernameInput')).toHaveValue('myusername');`,
              guidelines: [
                "Use this matcher for form elements to verify that the input value is correct.",
              ],
            },
            {
              signature: `toBeEnabled() / toBeDisabled()`,
              description:
                "Asserts that an element is enabled/disabled (if applicable).",
              example: `await expect(await $('~submitButton')).toBeEnabled();`,
              guidelines: [
                "Use these matchers to assert that an element is enabled or disabled as required by the test scenario.",
              ],
            },
            {
              signature: `not`,
              description: "Negates the expectation.",
              example: `await expect(await $('~spinner')).not.toBeDisplayed();`,
              guidelines: [
                "Use this matcher to invert the condition of any expectation, ensuring the element does not meet the specified criteria.",
              ],
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
          title: "Find text location on screen",
          items: [
            {
              signature: `await findTextLocation(string);`,
              description:
                "Finds the on-screen coordinates of all occurrences of the specified text (sorted by x, y occurrences)." +
                " Useful when the text is visible but not part of the view hierarchy.",
              example: `const coords = await findTextLocation('Next');
for (const point of coords) {
  try {
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: point.x, y: point.y },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 100 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await driver.releaseActions(); // Important to clean up actions
    break; // stop after successful tap
  } catch (e) {
    console.warn('Failed to tap on this point, trying next...');
  }
}`,
              guidelines: [
                "Use this when the text you want to interact with is visible on the screen but does not present in the view hierarchy.",
                "Make sure the text is clearly visible in the screenshot and not obscured.",
                "You can combine this with touch actions to tap on the text by coordinates.",
                "Do not use UI Automation for locating the inaccessible test element use this api",
              ],
            },
          ],
        },
      ],
    };
  }
}
