# @wix-pilot/prompt-handler

A unified PromptHandler for interacting with AI services (e.g., OpenAI) in test environments. This package is intended to be used as a devDependency in other packages for test automation and AI-driven workflows.

## Features
- Uploads UI snapshot images (optional)
- Sends prompts to the AI service
- Allows specifying the model as a parameter
- Consistent interface for all drivers

## Usage

```ts
import { PromptHandler } from '@wix-pilot/prompt-handler';

const handler = new PromptHandler({ model: 'SONNET_3_5' });
const response = await handler.runPrompt('Your prompt here', '/path/to/image.png');
```

## API

### `PromptHandler(options)`
- `model` (string, optional): The model to use (default: 'SONNET_3_5')

### `runPrompt(prompt: string, imagePath?: string): Promise<string>`
Sends a prompt (and optional image) to the AI service and returns the response.

### `isSnapshotImageSupported(): boolean`
Returns `true` if image snapshots are supported.

---

This package should be added as a devDependency in any package that uses it for testing.
