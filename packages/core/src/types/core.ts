import { TestingFrameworkDriver } from "@/types/framework";
import { PromptHandler } from "@/types/prompt";

/**
 * Pilot behavior configuration options.
 */
export interface PilotOptions {
  /** Cache options */
  cacheOptions?: CacheOptions;
}

export interface CacheOptions {
  /**
   * Optional function that returns the absolute path to the current test file.
   * Used for deriving the cache snapshot file names.
   */
  getCurrentTestFilePath?: () => string | undefined;
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
  /** Custom logger delegate implementation */
  loggerDelegate?: import("@/types/logger").LoggerDelegate;
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
  result?: any;
  /** Step execution error */
  error?: any;
};

/**
 * Cache value for StepPerformer.
 * Contains the generated code for a step.
 */
export interface StepPerformerCacheValue {
  /** Generated code */
  code: string;
}
