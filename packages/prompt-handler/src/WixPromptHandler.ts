import axios, { AxiosResponse } from 'axios';
import { promises as fs } from 'fs';

interface UploadImageResponseData {
  url: string;
}

interface RunPromptResponseData {
  generatedTexts: string[];
}

export interface WixPromptHandlerOptions {
  model?: string;
}

export class WixPromptHandler {
  private model: string;

  constructor(options: WixPromptHandlerOptions = {}) {
    this.model = options.model || 'SONNET_4_0';
  }

  async uploadImage(imagePath: string): Promise<string> {
    const image = await fs.readFile(imagePath);
    try {
      const response: AxiosResponse<UploadImageResponseData> = await axios.post(
        'https://bo.wix.com/mobile-infra-ai-services/v1/image-upload',
        { image },
      );
      const imageUrl: string | undefined = response.data.url;
      if (!imageUrl) {
        throw new Error(
          `Cannot find uploaded URL, got response: ${JSON.stringify(response.data)}`,
        );
      }
      return imageUrl;
    } catch (error) {
      console.error('Error while uploading image:', error);
      throw error;
    }
  }

  async runPrompt(prompt: string, imagePath?: string): Promise<string> {
    let images: string[] = [];
    if (imagePath) {
      const imageUrl = await this.uploadImage(imagePath);
      images = [imageUrl];
    }
    try {
      const response: AxiosResponse<RunPromptResponseData> = await axios.post(
        'https://bo.wix.com/mobile-infra-ai-services/v2/prompt',
        {
          prompt,
          model: this.model,
          ownershipTag: 'Detox OSS',
          project: 'Detox OSS',
          images,
        },
      );
      const generatedText: string | undefined = response.data.generatedTexts[0];
      if (!generatedText) {
        throw new Error(
          `Failed to generate text, got response: ${JSON.stringify(response.data)}`,
        );
      }
      return generatedText;
    } catch (error) {
      console.error('Error running prompt:', error);
      throw error;
    }
  }

  isSnapshotImageSupported(): boolean {
    return true;
  }
}
