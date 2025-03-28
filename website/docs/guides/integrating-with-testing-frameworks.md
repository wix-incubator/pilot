---
id: integrating-with-testing-frameworks
title: Integrating with Testing Frameworks
sidebar_label: Integrating with Testing Frameworks
sidebar_position: 1
---

# Integrating with Testing Frameworks

## Overview

**Wix Pilot** is a versatile tool that allows developers to write tests using natural language commands. Pilot works with various testing frameworks including Puppeteer, Playwright, Detox, Appium, and supports custom driver implementations. It streamlines the testing process by converting human-readable instructions into actionable test steps.

This integration is powered by a specialized driver, which connects Pilot with the testing framework's API. This driver allows Pilot to perform various testing actions—such as matching elements or performing interactions—while preserving a natural language interface. By doing so, Pilot enhances both the readability and maintainability of test scripts.

## Key Capabilities and Integration Process

To integrate Pilot with a testing framework, there are a few core components involved:

### 1. Framework Driver
The framework driver acts as the bridge between Pilot and your chosen testing framework. It defines matchers, actions, and behaviors that align with the framework's API, enabling Pilot to translate natural language commands into executable code.

:::info Supported Frameworks
Pilot supports multiple testing frameworks including Puppeteer, Playwright, Detox, Appium, and custom driver implementations.

For a complete list of supported frameworks and implementation details, please refer to the [Supported Frameworks](../pages/supported-frameworks) page.
:::

For more detailed information about defining and using framework drivers, including an example, please refer to the [Framework Driver API](../API/framework-driver.md) page.

### 2.  Implement a PromptHandler
In addition to the driver, Pilot needs a PromptHandler to interact with the AI service. A prompt handler can be tailored to support specific needs, such as image uploading or generating text based on complex inputs.
For more information on creating a custom PromptHandler, please refer to the [PromptHandler API](../API/prompt-handler.md) page.

### 3. Build an Instance of Pilot Using ``init``
After defining the driver and the PromptHandler, you can initialize Pilot by calling the init method. This method requires both the custom frameworkDriver and the promptHandler to be passed in.
For more detailed information, refer to the [Basic Interface Overview - init, start, perform, end](../API/basic-interface-overview.md) page.
