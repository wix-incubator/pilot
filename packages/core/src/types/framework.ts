/**
 * Driver interface for interacting with the underlying testing framework.
 */
export interface TestingFrameworkDriver {
  /**
   * Captures the current UI state as an image.
   * @returns Path to saved image, or undefined if imaging not supported
   */
  captureSnapshotImage: () => Promise<string | undefined>;

  /**
   * Captures the current UI component hierarchy.
   * @returns String representation of view hierarchy
   */
  captureViewHierarchyString: () => Promise<string>;

  /**
   * Available testing framework API methods.
   */
  apiCatalog: TestingFrameworkAPICatalog;

  /**
   * Additional driver configuration options.
   */
  driverConfig: TestingFrameworkDriverConfig;
}

/**
 * Additional driver configuration.
 *
 * @property shouldUseScreenSync - Indicates whether the driver should use wait for screen stability.
 */
export type TestingFrameworkDriverConfig = {
  shouldUseScreenSync: boolean;
};

/**
 * Testing framework API catalog structure.
 */
export type TestingFrameworkAPICatalog = {
  /** Framework name (e.g., "Detox", "Jest") */
  name?: string;
  /** Framework purpose and capabilities */
  description?: string;
  /** Framework context variables */
  context: any;
  /** Available API method categories */
  categories: TestingFrameworkAPICatalogCategory[];
  /** List of restrictions and guidlines of wrong actions */
  restrictions?: string[];
  /** Allows pilot to delay failure with extended actions*/
  extended_step?: boolean;
};

/**
 * Category of related testing framework API methods.
 */
export type TestingFrameworkAPICatalogCategory = {
  /** Category name */
  title: string;
  /** Methods in this category */
  items: TestingFrameworkAPICatalogItem[];
};

/**
 * Documentation for a testing framework API method.
 * @example
 * {
 *   signature: 'type(text: string)',
 *   description: 'Types text into target element',
 *   example: 'await element(by.id("username")).type("john_doe")',
 *   guidelines: ['Only works on text fields']
 * }
 */
export type TestingFrameworkAPICatalogItem = {
  /** Method signature */
  signature: string;
  /** Method description */
  description: string;
  /** Usage example */
  example: string;
  /** Optional usage guidelines */
  guidelines?: string[];
};
