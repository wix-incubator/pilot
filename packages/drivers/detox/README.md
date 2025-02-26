# @wix-pilot/detox 📱

> Detox driver for Wix Pilot - React Native testing with natural language

## Overview

The `@wix-pilot/detox` package provides Detox integration for Wix Pilot, enabling:
- React Native app testing
- Native UI automation
- Component-based testing
- Cross-platform mobile testing

## Installation

```bash
# npm
npm install --save-dev @wix-pilot/detox detox @wix-pilot/core

# yarn
yarn add -D @wix-pilot/detox detox @wix-pilot/core
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
import { DetoxFrameworkDriver } from '@wix-pilot/detox';

describe('React Native App Testing', () => {
  beforeAll(async () => {
    pilot.init({
      driver: new DetoxFrameworkDriver(),
      promptHandler: new CustomPromptHandler(),
    });
  });

  beforeEach(() => pilot.start());
  afterEach(() => pilot.end());

  it('should handle login flow', async () => {
    await pilot.perform([
      'Launch the app',
      'Tap the "Login" button',
      'Enter "test@example.com" in the email field',
      'Enter "password123" in the password field',
      'Tap the "Submit" button',
      'The dashboard should be visible'
    ]);
  });
});
```

## Related Packages

- [@wix-pilot/core](../../core) - Core Wix Pilot engine
- [@wix-pilot/appium](../appium) - Alternative mobile testing driver
