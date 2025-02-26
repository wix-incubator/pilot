<div align="center">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./logo/dark.png">
      <source media="(prefers-color-scheme: light)" srcset="./logo/light.png">
      <img alt="Wix Pilot logo" src="./logo/dark.png">
    </picture>
    <br>
    <b>Write tests in plain text, powered by AI</b>
</div>
<br>

Wix Pilot is an AI-powered testing framework that translates human-readable commands into precise testing actions. Originally designed for Detox, it now supports multiple testing platforms including Puppeteer, Playwright, Appium, and more.

## 🌟 Key Features

- **Natural Language Testing**: Write tests in plain English (or any language you prefer)
- **Multi-Platform Support**: Works with Detox, Puppeteer, Playwright, and Appium
- **AI-Enhanced**: Powered by LLMs for intelligent test interpretation
- **Extensible**: Easy to add support for new testing frameworks and custom APIs

## 📝 Installation

```bash
# npm
npm install --save-dev @wix-pilot/core

# yarn
yarn add -D @wix-pilot/core
```

You will also need to install a driver for your testing framework, here are the drivers supported by Wix Pilot:

```bash
npm install --save-dev @wix-pilot/detox # Detox
npm install --save-dev @wix-pilot/webdriverio-appium # Appium (WebDriverIO)
npm install --save-dev @wix-pilot/puppeteer # Puppeteer
npm install --save-dev @wix-pilot/playwright # Playwright
```


## 📚 Quick Start

### Setting up the LLM Handler
```typescript
import { PromptHandler } from '@wix-pilot/core';

// Implement your LLM service handler
class CustomPromptHandler implements PromptHandler {
  async runPrompt(prompt: string, image?: string): Promise<string> {
    // Integrate with your preferred LLM (OpenAI, Anthropic, etc.)
    const response = await yourLLMService.complete({
      prompt,
      imageUrl: image, // Optional: for visual testing support
    });
    return response.text;
  }

  isSnapshotImageSupported(): boolean {
    return true; // Set to true if your LLM supports image analysis
  }
}
```

### Web Testing
Wix Pilot supports both [Puppeteer](https://pptr.dev/) and [Playwright](https://playwright.dev/) for web testing, for example:

```typescript
import pilot from '@wix-pilot/core';
import puppeteer from 'puppeteer';
// Import your preferred web driver
import { PlaywrightFrameworkDriver } from '@wix-pilot/playwright';

describe('Web Testing', () => {
  beforeAll(async () => {
    pilot.init({
      frameworkDriver: new PlaywrightFrameworkDriver(),
      promptHandler: new CustomPromptHandler(),
    });
  });

  beforeEach(() => pilot.start());
  afterEach(() => pilot.end());

  // Perform a test with Pilot
  it('should search for a domain', async () => {
    await pilot.perform([
      'Open the URL https://www.wix.com/domains',
      'Type "my-domain.com" in the search input',
      'Click the "Search" button',
      'The domain availability message should appear'
    ]);
  });
  
  // Perform an autonomous flow with AutoPilot
  it('should search for a domain (AutoPilot)', async () => {
    const report = await pilot.autopilot('Check domain availability for "my-domain.com", verify availability message');
    console.log(report);
  });
});
```

### Mobile Testing
Wix Pilot supports both [Detox](https://wix.github.io/Detox/) and [Appium (WebdriverIO)](https://webdriver.io/docs/api/appium/) for mobile apps testing:

```typescript
import pilot from '@wix-pilot/core';
// Import your preferred driver
import { DetoxFrameworkDriver } from '@wix-pilot/detox';

describe('Mobile App', () => {
  beforeAll(() => {
    // Initialize with Detox
    pilot.init({
      frameworkDriver: new DetoxFrameworkDriver(),
      promptHandler: new CustomPromptHandler(),
    });
  });

  beforeEach(() => pilot.start());
  afterEach(() => pilot.end());

  it('should handle login flow', async () => {
    await pilot.perform([
      'Enter "test@example.com" in the email field',
      'Enter "password123" in the password field',
      'Tap the login button',
      'The dashboard should be visible'
    ]);
  });
});
```

## 🔧 API Overview

The main interface for Pilot:

```typescript
interface PilotFacade {
  // Initialize Pilot with configuration
  init(config: Config): void;

  // Start a new test flow
  start(): void;

  // Execute test steps
  perform(steps: string | string[]): Promise<any>;
  
  // Execute a high-level test goal
  autopilot(goal: string): Promise<AutoReport>;

  // End current test flow
  end(isCacheDisabled?: boolean): void;
}
```

### Configuration

```typescript
interface Config {
  // Test automation driver (Puppeteer, Detox, etc.)
  frameworkDriver: TestingFrameworkDriver;
    
  // LLM service handler for natural language processing
  promptHandler: PromptHandler;
    
  // Optional settings
  options?: PilotOptions
}
```

### Pilot Perform API
Execute a series of test steps:

```typescript
// Example usage:
await pilot.perform([
  'Open the products catalog at https://www.example.com/products', 
  'Click the "Add to Cart" button on the first product',
  'Verify the cart icon shows "1" item',
  'Click the cart icon',
  'Verify the cart page shows the product added'
]);
```

### AutoPilot API
Enhanced mode for autonomous testing:

```typescript
// Example usage:
const report = await pilot.autopilot(
  'Test the "Add to Cart" functionality on the product page'
);
```

The AutoReport includes:
- Detailed step-by-step execution and results
- UX, accessibility, and i18n reviews and score (Beta)
- Recommendations for improvements

## 🎉 Demo

Here's an example of how Pilot runs over a Detox test case:

<img src="copilot-demo.gif" width="800">

The test case is written in human-readable format, and Pilot translates it into framework-specific actions on the fly.
