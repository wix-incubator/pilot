export type ElementCategory =
  | "button"
  | "link"
  | "input"
  | "list"
  | "table"
  | "header"
  | "semantic"
  | "scrollable";

export interface ElementHandle {
  // Optional: Define common methods if needed
}

export interface Page {
  evaluate<T = any>(
    pageFunction: string | ((...args: any[]) => T | Promise<T>),
    ...args: any[]
  ): Promise<T>;

  addScriptTag(options: {
    content?: string;
    path?: string;
    url?: string;
    type?: string;
  }): Promise<any>;

  screenshot(options?: {
    path?: string;
    fullPage?: boolean;
    [key: string]: any;
  }): Promise<Buffer | string>;

  close(): Promise<void>;
}
