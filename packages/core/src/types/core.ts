import {
  TestingFrameworkDriver,
  TestingFrameworkAPICatalogCategory,
} from "@/types/framework";
import { PromptHandler } from "@/types/prompt";
import { AutoReport } from "@/types/auto";

/**
 * Core interface for interacting with the Pilot testing automation system.
 */
export interface PilotFacade {
  /**
   * Initializes Pilot with the provided configuration.
   * Must be called once before using any other methods.
   * @param config - Configuration settings for Pilot
   * @throws Error if called multiple times
   */
  init: (config: Config) => void;

  /**
   * Checks if Pilot has been properly initialized.
   * @returns true if initialized, false otherwise
   */
  isInitialized: () => boolean;

  /**
   * Starts a new test flow session.
   * Must be called before any test operations to ensure a clean state,
   * as Pilot uses operation history for context.
   */
  start: () => void;

  /**
   * Ends the current test flow session and handles cache management.
   * @param shouldSaveInCache - If true, the current test flow will be saved in cache
   */
  end: (shouldSaveInCache?: boolean) => void;

  /**
   * Executes one or more test operations in sequence.
   * @param steps - Array of test step descriptions to perform
   * @returns Result of the final executed step
   * @example
   * // Single step
   * await perform('Tap on the login button')
   * // Multiple steps
   * await perform(
   *   'Scroll down to the 7th item',
   *   'The welcome message should be visible',
   *   'The welcome text should be "Hello"'
   * )
   */
  perform: (...steps: string[]) => Promise<string>;

  /**
   * Autonomously performs actions to achieve a specified testing goal.
   * @param goal - Description of the desired end state or objective
   * @returns Detailed report of actions taken and results
   * @example
   * await autopilot('login with user "testuser" and password "pass123"')
   * await autopilot('complete purchase flow in "my store"')
   */
  autopilot: (goal: string) => Promise<AutoReport>;

  /**
   * Extends the testing framework's API capabilities.
   * @param categories - Additional API categories to add
   * @param context - Testing framework variables to expose
   */
  extendAPICatalog: (
    categories: TestingFrameworkAPICatalogCategory[],
    context?: any,
  ) => void;
}

/**
 * Pilot behavior configuration options.
 */
export interface PilotOptions {
  /** Cache options */
  cacheOptions?: CacheOptions;
}

export interface CacheOptions {
  /** If true, cache will be used for operations (default: true) */
  shouldUseCache?: boolean;
  /** If true, cache will be updated with new data (default: false) */
  shouldOverrideCache?: boolean;
}

/**
 * Complete Pilot configuration.
 */
export interface Config {
  /** Testing framework driver */
  frameworkDriver: TestingFrameworkDriver;
  /** AI service handler */
  promptHandler: PromptHandler;
  /** Optional behavior settings */
  options?: PilotOptions;
}

/**
 * Executed test step record.
 */
export type PreviousStep = {
  /** Step description */
  step: string;
  /** Generated test code */
  code: string;
  /** Step execution result */
  result: any;
};
