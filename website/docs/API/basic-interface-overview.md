---
id: basic-interface-overview
title: Basic Interface Overview
sidebar_label: Basic Interface Overview
sidebar_position: 1
---

# Basic Interface Overview

Pilot provides a simple yet powerful interface for controlling your test flows. This document covers the core API methods and configuration options.

## Creating a Pilot Instance

To create a Pilot instance, import the `Pilot` class and instantiate it with a configuration:

```typescript
import { Pilot } from '@wix-pilot/core';
import { PuppeteerFrameworkDriver } from '@wix-pilot/puppeteer';
import { OpenAIHandler } from '<your-openai-handler>';

const pilot = new Pilot({
  frameworkDriver: new PuppeteerFrameworkDriver(),
  promptHandler: new OpenAIHandler({
    apiKey: process.env.OPENAI_API_KEY
  }),
  options: {
    cacheOptions: {
      shouldUseCache: true,
      shouldOverrideCache: false
    }
  }
});
```

## API Methods

### start()

```typescript
start(): void
```

Starts a new test flow by clearing previous steps and temporary cache.

:::note
Throws an error if a flow is already active.
:::

```typescript
pilot.start();
```

### perform()

```typescript
perform(...steps: string[]): Promise<any>
```

Executes one or more test steps using natural language. Returns the result of the last executed step.

:::note
Requires an active test flow (initiated by `start()`).
:::

Examples:
```typescript
// Single step
const result = await pilot.perform('Click the login button');

// Multiple steps in sequence
const result = await pilot.perform(
  'Launch the app',
  'Navigate to Settings',
  'Tap on "Edit Profile"',
  'Update username to "john_doe"',
  'Verify changes are saved'
);
```

### Using Multiple Pilot Instances

You can create multiple Pilot instances to run concurrent tests with different configurations or frameworks:

```typescript
import { Pilot } from '@wix-pilot/core';
import { PuppeteerFrameworkDriver } from '@wix-pilot/puppeteer';
import { PlaywrightFrameworkDriver } from '@wix-pilot/playwright';
import { OpenAIHandler } from '<your-openai-handler>';

// Create instances with different drivers
const puppeteerPilot = new Pilot({
  frameworkDriver: new PuppeteerFrameworkDriver(),
  promptHandler: new OpenAIHandler({
    apiKey: process.env.OPENAI_API_KEY
  })
});

const playwrightPilot = new Pilot({
  frameworkDriver: new PlaywrightFrameworkDriver(),
  promptHandler: new OpenAIHandler({
    apiKey: process.env.OPENAI_API_KEY
  })
});

// Use instances independently
puppeteerPilot.start();
playwrightPilot.start();

await puppeteerPilot.perform('Navigate to the login page');
await playwrightPilot.perform('Open the dashboard');

puppeteerPilot.end();
playwrightPilot.end();
```

:::tip When to use multiple instances
Multiple instances are useful for running automation flows in multiple environments or with different testing frameworks.
For example, you can use one instance for web testing with Puppeteer and another for mobile testing with Appium, or to execute operations with the same framework in parallel.
:::

### perform()

```typescript
perform(...steps: string[]): Promise<any>
```

Executes one or more test steps using natural language. Returns the result of the last executed step.

:::note
Requires an active test flow (initiated by `start()`).
:::

Examples:
```typescript
// Single step
const result = await pilot.perform('Click the login button');

// Multiple steps in sequence
const result = await pilot.perform(
  'Launch the app',
  'Navigate to Settings',
  'Tap on "Edit Profile"',
  'Update username to "john_doe"',
  'Verify changes are saved'
);
```

### autopilot()

```typescript
autopilot(goal: string): Promise<AutoReport>
```

Executes an entire test flow automatically based on a high-level goal. Instead of specifying individual steps, you describe the end goal and let Pilot figure out the necessary steps.

:::note
Requires an active test flow (initiated by `start()`).
:::

Example:
```typescript
// Let Pilot handle the entire flow
const report = await pilot.autopilot(
  'Log in as admin user and verify access to all dashboard sections'
);

// Or achieve the same result as the multiple steps example
const report = await pilot.autopilot(
  'Update the profile username to john_doe and verify the changes'
);
```

### end()

```typescript
end(isCacheDisabled?: boolean): void
```

Ends the test flow and optionally saves the temporary cache.

:::note
Throws an error if no flow is active.
:::

```typescript
// Save results to cache (default)
pilot.end();

// Skip saving to cache
pilot.end(true);
```

### extendAPICatalog()

```typescript
extendAPICatalog(categories: TestingFrameworkAPICatalogCategory[], context?: any): void
```

Enriches the API catalog with additional testing framework capabilities.

```typescript
pilot.extendAPICatalog([
  {
    title: 'Custom Actions',
    items: [
      {
        signature: 'customAction(param: string)',
        description: 'Performs a custom action',
        example: 'await customAction("param")',
        guidelines: [
          'Use this action for specific test scenarios'
        ]
      }
    ]
  }
], customContext);
```

## Configuration

### Config Interface

```typescript
import {CacheOptions} from "@wix-pilot/core/dist/types";

interface Config {
    /** Testing framework driver */
    frameworkDriver: TestingFrameworkDriver;
    /** AI service handler */
    promptHandler: PromptHandler;
    /** Optional behavior settings */
    options?: PilotOptions;
}

interface PilotOptions {
    /** Cache options */
    cacheOptions?: CacheOptions;
}

interface CacheOptions {
    /** If true, cache will be used for operations (default: true) */
    shouldUseCache?: boolean;
    /** If true, cache will be updated with new data (default: false) */
    shouldOverrideCache?: boolean;
}
```

### Framework Driver Interface

```typescript
interface TestingFrameworkDriver {
  /** Captures the current UI state as an image */
  captureSnapshotImage(): Promise<string | undefined>;
  
  /** Captures the current UI component hierarchy */
  captureViewHierarchyString(): Promise<string>;
  
  /** Available testing framework API methods */
  apiCatalog: TestingFrameworkAPICatalog;
}

interface TestingFrameworkAPICatalog {
  /** Framework name (e.g., "Detox", "Jest") */
  name?: string;
  /** Framework purpose and capabilities */
  description?: string;
  /** Framework context variables */
  context: any;
  /** Available API method categories */
  categories: TestingFrameworkAPICatalogCategory[];
  /** List of restrictions and guidelines */
  restrictions?: string[];
}
```

## Error Handling

Pilot throws errors when:
- Starting a flow while another is active
- Performing steps without an active flow
- Ending a flow that hasn't been started

Complete flow with error handling:
```typescript
try {
  const pilot = new Pilot({
    frameworkDriver: new PuppeteerFrameworkDriver(),
    promptHandler: new OpenAIHandler({
      apiKey: process.env.OPENAI_API_KEY
    })
  });
  
  pilot.start();
  
  // Execute multiple steps
  await pilot.perform(
    'Click the login button',
    'Type "test@example.com" into the email field',
    'The login form should be visible'
  );
  
  // Or use autopilot for goal-driven testing
  await pilot.autopilot('Log in with test@example.com and verify success');
  
  pilot.end();
} catch (error) {
  // Disable cache on error
  if (pilot) pilot.end(false);
  throw error;
}
```
