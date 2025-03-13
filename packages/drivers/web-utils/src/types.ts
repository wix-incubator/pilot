export type ElementCategory =
  | "button"
  | "link"
  | "input"
  | "list"
  | "table"
  | "header"
  | "semantic"
  | "scrollable";

export type CandidateScore = {
  candidate: HTMLElement | null;
  errorScore: number;
};

export type HighlightItem = {
  outlineDiv: HTMLDivElement;
  label: HTMLDivElement;
  boundingRect: DOMRect;
  zIndex: number;
};

export type CandidateToBeMarked = {
  element: HTMLElement;
  category: ElementCategory;
  center: [number, number];
  zIndex: number;
  area: number;
};

export type Rect = {
  x: number;
  y: number;
};

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
