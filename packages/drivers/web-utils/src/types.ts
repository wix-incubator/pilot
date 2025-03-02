export type ElementCategory =
  | "button"
  | "link"
  | "input"
  | "list"
  | "table"
  | "header"
  | "semantic"
  | "scrollable";

export type Rect = {
  x: number;
  y: number;
};

export type SelectorCriteria = {
  rect?: Rect;
  "aria-label"?: string;
  "aria-role"?: string;
  class?: string;
  id?: string;
  name?: string;
  title?: string;
  placeholder?: string;
};

export type AttributeRule = {
  weight: number;
  enforce: boolean;
};

export type InterestingAttributes = {
  rect: Rect;
  "aria-label": string | null;
  "aria-role": string | null;
  class: string;
  id: string | null;
  name: string | null;
  title: string | null;
  placeholder: string | null;
};
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

  evaluateHandle<T = any>(
    pageFunction: string | ((...args: any[]) => T | Promise<T>),
    ...args: any[]
  ): Promise<any>;

  screenshot(options?: {
    path?: string;
    fullPage?: boolean;
    [key: string]: any;
  }): Promise<Buffer | string>;

  close(): Promise<void>;
}
