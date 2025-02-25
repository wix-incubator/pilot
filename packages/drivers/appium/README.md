# @wix-pilot/appium 📱

> Appium driver for Wix Pilot - Cross-platform mobile testing with natural language

## Overview

The `@wix-pilot/webdriverio-appium` package provides Appium integration for Wix Pilot, enabling:
- Native iOS and Android app testing
- Hybrid app testing
- Mobile web testing
- Cross-platform test automation

## Installation

```bash
# npm
npm install --save-dev @wix-pilot/webdriverio-appium webdriverio @wix-pilot/core

# yarn
yarn add -D @wix-pilot/webdriverio-appium webdriverio @wix-pilot/core
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
import { WebdriverIOAppiumFrameworkDriver } from '@wix-pilot/webdriverio-appium';

describe('Mobile App Testing', () => {
  beforeAll(async () => {
    pilot.init({
      driver: new WebdriverIOAppiumFrameworkDriver(),
      promptHandler: new CustomPromptHandler(),
    });
  });

  beforeEach(() => pilot.start());
  afterEach(() => pilot.end());

  it('should handle shopping cart flow', async () => {
    await pilot.perform([
      'Launch the app',
      'Allow any permission prompts',
      'Tap the "Products" tab',
      'Scroll to "Wireless Headphones"',
      'Add item to cart',
      'The cart badge should show "1"'
    ]);
  });
});
```

## Related Packages

- [@wix-pilot/core](../../core) - Core Wix Pilot engine
- [@wix-pilot/detox](../detox) - Alternative React Native testing driver
