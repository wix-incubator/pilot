# @wix-pilot/playwright 🎭

> Playwright driver for Wix Pilot - Modern web testing with natural language

## Overview

The `@wix-pilot/playwright` package provides Playwright integration for Wix Pilot, offering:
- Cross-browser testing (Chromium, Firefox, WebKit)
- Modern web platform features
- Network interception and mocking
- Mobile device emulation

## Installation

```bash
# npm
npm install --save-dev @wix-pilot/playwright @playwright/test @wix-pilot/core

# yarn
yarn add -D @wix-pilot/playwright @playwright/test @wix-pilot/core
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
import { chromium } from '@playwright/test';
import { PlaywrightFrameworkDriver } from '@wix-pilot/playwright';

describe('Cross-browser Testing', () => {
  beforeAll(async () => {
    pilot.init({
      driver: new PlaywrightFrameworkDriver(),
      promptHandler: new CustomPromptHandler(),
    });
  });

  beforeEach(() => pilot.start());
  afterEach(() => pilot.end());
  afterAll(async () => {
    await frameworkDriver.getCurrentPage()?.context().browser().close();
  });

  it('should work across different browsers', async () => {
    await pilot.perform([
      'Navigate to "https://example.com"',
      'Click the "Accept Cookies" button if visible',
      'Switch to the dark theme',
      'The page should have a dark background',
      'Take a screenshot of the entire page'
    ]);
  });
});
```

## Related Packages

- [@wix-pilot/core](../../core) - Core Wix Pilot engine
- [@wix-pilot/puppeteer](../puppeteer) - Alternative web testing driver
- [@wix-pilot/web-utils](../web-utils) - Shared web testing utilities
