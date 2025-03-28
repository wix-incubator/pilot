---
id: framework-driver
title: Framework Driver
sidebar_label: Framework Driver
sidebar_position: 3
---

# Framework Driver

In this section, we will explain how to implement custom drivers for different testing frameworks in **Pilot**. A **Framework Driver** is a crucial component that ensures **Pilot** remains agnostic to the underlying testing framework, allowing it to work seamlessly with different frameworks like Detox, Jest, Mocha, etc.

## What is a Framework Driver?

A **Framework Driver** provides an abstraction layer between **Pilot** and the underlying testing framework. It defines the necessary methods to interact with the testing framework's API and potentially supports features such as taking snapshots of the app's UI and capturing the view hierarchy.

By implementing a custom driver, you enable **Pilot** to communicate with your chosen testing framework, making it flexible and adaptable to a variety of testing environments.

### TestingFrameworkDriver Interface

The `TestingFrameworkDriver` interface defines the essential methods that a driver should implement:

- **`captureSnapshotImage`**: Takes a snapshot of the current screen and returns the path to the saved image. If the driver does not support snapshot functionality, it should return `undefined`.
- **`captureViewHierarchyString`**: Returns the current view hierarchy in a string representation, which helps the AI understand the structure of the app's UI.
- **`apiCatalog`**: Provides access to the available methods of the testing framework's API, such as matchers and actions. The catalog can also include optional framework information:
  - `name`: The name of the testing framework (e.g., "Detox", "Jest")
  - `description`: A description of the framework's purpose and capabilities

Here's the interface definition for the driver:

```typescript
/**
 * Interface for the testing driver that will be used to interact with the underlying testing framework.
 */
export interface TestingFrameworkDriver {
    /**
     * Takes a snapshot of the current screen and returns the path to the saved image.
     * If the driver does not support image, return undefined.
     */
    captureSnapshotImage: () => Promise<string | undefined>;

    /**
     * Returns the current view hierarchy in a string representation.
     */
    captureViewHierarchyString: () => Promise<string>;

    /**
     * The available API methods of the testing framework.
     */
    apiCatalog: TestingFrameworkAPICatalog;
}
```
### Example: Detox Testing Framework Driver

The following example demonstrates **part of the implementation** of a **Framework Driver** for the **Detox** testing framework. This snippet focuses on integrating core functionality like matchers, actions, and snapshot capabilities:

```typescript
const jestExpect = require('expect').default;
const detox = require('../..');

const detoxPilotFrameworkDriver = {
  apiCatalog: {
    context: { ...detox, jestExpect },
    name: 'Detox',
    description: 'End-to-end testing and automation framework for mobile apps',
    categories: [
      {
        title: 'Matchers',
        items: [
          {
            signature: 'by.id(id: string)',
            description: 'Matches elements by their test ID.',
            example: "element(by.id('loginButton'))",
            guidelines: ['Use test IDs (accessibility identifiers) to uniquely identify elements. This is the best-practice matcher.'],
          },
          {
            signature: 'by.text(text: string)',
            description: 'Matches elements by their text (value).',
            example: "element(by.text('Login'))",
            guidelines: ['Prefer test IDs over text matchers when possible.'],
          },
          // Additional matchers can be added here...
        ],
      },
      {
        title: 'Actions',
        items: [
          {
            signature: 'tap(point?: Point2D)',
            description: 'Simulates tap on an element.',
            example: "await element(by.id('loginButton')).tap();",
          },
          {
            signature: 'longPress(point?: Point2D, duration?: number)',
            description: 'Simulates long press on an element.',
            example: "await element(by.id('menuItem')).longPress();",
            guidelines: ['Tapping on edges of elements might work better when adding a small offset to the point.'],
          },
          // Additional actions can be added here...
        ],
      },
    ],
  },
  // Example method implementations:
  captureSnapshotImage: async () => {
    try {
      const screenshot = await detox.device.takeScreenshot();
      return screenshot;
    } catch (error) {
      console.error('Error capturing snapshot:', error);
      return undefined;
    }
  },

  captureViewHierarchyString: async () => {
    try {
      const hierarchy = await detox.device.getUIHierarchy();
      return hierarchy;
    } catch (error) {
      console.error('Error capturing view hierarchy:', error);
      return '';
    }
  },
};

module.exports = detoxPilotFrameworkDriver;
```
### Optional Support for Snapshot

The **Framework Driver** can optionally support snapshot functionality. If the underlying framework supports capturing screenshots or images of the app, this feature can be implemented in the `captureSnapshotImage` method. If the driver does not support snapshots, it should return `undefined`.

### Referencing Relevant Types

The types related to the **Testing Framework Driver** can be found in the source code files under the following locations:

- `TestingFrameworkDriver` interface is defined in the `src/types` folder.
- `TestingFrameworkAPICatalog` provides information about the available API methods and can also be found in the same folder.

## Conclusion

By implementing a **Framework Driver**, **Pilot** can work with any testing framework, giving users flexibility in their testing setup. For more detailed instructions, you can refer to the relevant types and source code for guidance.

If you are interested in contributing or have any suggestions for improving the **Framework Driver** system, check out the open tasks on our [GitHub repository](https://github.com/wix-incubator/detox-copilot/issues).
