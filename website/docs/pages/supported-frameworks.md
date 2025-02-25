# Supported Frameworks for Pilot

**Pilot** enables natural language testing across different testing frameworks. Here's how to use it with our supported frameworks:

## Mobile Testing Support

### Detox

Our primary supported framework for mobile app testing. [See Detox documentation](https://wix.github.io/Detox/docs/).

```js
it('should update profile', async () => {
  await pilot.perform(
    'Launch the app',
    'Navigate to Settings',
    'Tap on "Edit Profile"',
    'Update username to "john_doe"',
    'Verify changes are saved'
  );
});
```

### WebdriverIO with Appium

WebdriverIO integration with Appium. supports both iOS and Android testing

```js
// 1. Install: npm install --save-dev @wix-pilot/webdriverio-appium
// 2. Import and use:
import { WebdriverIOAppiumFrameworkDriver } from '@wix-pilot/webdriverio-appium';

it('should update profile', async () => {
  await pilot.perform(
    'Launch the app',
    'Navigate to Settings',
    'Tap on "Edit Profile"',
    'Update username to "john_doe"',
    'Verify changes are saved'
  );
});
```

## Web Testing Support

### Playwright

```js
// 1. Install: npm install --save-dev @wix-pilot/playwright
// 2. Import and use:
import { PlaywrightFrameworkDriver } from '@wix-pilot/playwright';

it('should login', async () => {
  await pilot.perform(
    'Open "https://example.com" in the browser',
    'Fill in the username field with "testuser"',
    'Fill in the password field with "password123"',
    'Click the login button',
    'Verify that the dashboard is visible'
  );
});
```

Supports Chrome, Firefox, and WebKit with powerful auto-waiting mechanisms.

### Puppeteer

```js
// 1. Install: npm install --save-dev @wix-pilot/puppeteer
// 2. Import and use:
import { PuppeteerFrameworkDriver } from '@wix-pilot/puppeteer';

it('should submit a form', async () => {
  await pilot.perform(
    'Open "https://example.com/signup" in the browser',
    'Fill in the email field with "user@example.com"',
    'Check the terms checkbox',
    'Click submit',
    'Verify success message appears'
  );
});
```

Specialized for Chrome/Chromium automation with DevTools Protocol access.

## Extending Framework Support

You can add support for additional testing frameworks by implementing the `FrameworkDriver` interface:

```typescript
import { Pilot, FrameworkDriver } from '@wix-pilot/core';

class CustomFrameworkDriver implements FrameworkDriver {
  // Implement required methods
}

// Initialize Pilot with your custom framework
Pilot.init({
  frameworkDriver: new CustomFrameworkDriver(),
  promptHandler: yourPromptHandler
});
```

## Contributing

Want to add support for another framework? Check our [GitHub Issues](https://github.com/wix-incubator/pilot/issues) or submit a PR.
