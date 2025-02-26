# @wix-pilot/puppeteer 🎭

> Puppeteer driver for Wix Pilot - Automate Chrome/Chromium with natural language

## Overview

The `@wix-pilot/puppeteer` package provides Puppeteer integration for Wix Pilot, enabling:
- Browser automation using natural language
- Chrome DevTools Protocol support
- Screenshot and PDF generation
- Network interception and modification

## Installation

```bash
# npm
npm install --save-dev @wix-pilot/puppeteer puppeteer @wix-pilot/core

# yarn
yarn add -D @wix-pilot/puppeteer puppeteer @wix-pilot/core
```

## Usage

### 1. Set up your LLM Handler
```typescript
import { PromptHandler } from '@wix-pilot/core';

class CustomPromptHandler implements PromptHandler {
  async runPrompt(prompt: string, image?: string): Promise<string> {
    // Integrate with your preferred LLM service
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

### 2. Create and Run Tests
```typescript
import pilot from '@wix-pilot/core';
import puppeteer from 'puppeteer';
import { PuppeteerFrameworkDriver } from '@wix-pilot/puppeteer';

describe('Web Testing', () => {
  beforeAll(async () => {
    pilot.init({
      driver: new PuppeteerFrameworkDriver(),
      promptHandler: new CustomPromptHandler(),
    });
  });

  beforeEach(() => pilot.start());
  afterEach(() => pilot.end());
  afterAll(async () => {
    await frameworkDriver.getCurrentPage()?.browser().close();
  });

  it('should handle complex web interactions', async () => {
    await pilot.perform([
      'Navigate to "https://example.com"',
      'Wait for the page to load completely',
      'Click the "Sign Up" button',
      'Fill the registration form with random data',
      'Submit the form',
      'A success message should be visible'
    ]);
  });
});
```

## Related Packages

- [@wix-pilot/core](../../core) - Core Wix Pilot engine
- [@wix-pilot/playwright](../playwright) - Alternative web testing driver
- [@wix-pilot/web-utils](../web-utils) - Shared web testing utilities
