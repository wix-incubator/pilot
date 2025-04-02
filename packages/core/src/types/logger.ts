/**
 * Supported colors for logger messages.
 * These colors are based on the chalk color palette.
 */
export type LoggerMessageColor =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | "grey"
  | "blackBright"
  | "redBright"
  | "greenBright"
  | "yellowBright"
  | "blueBright"
  | "magentaBright"
  | "cyanBright"
  | "whiteBright";

/**
 * Logger message component, used to build formatted log messages.
 * Messages can be either plain strings or objects with formatting options.
 * When providing a string, it will be displayed with the default color for the log level.
 *
 * @property message - The text content to log
 * @property isBold - Whether to make the message bold (default: false)
 * @property color - The color to use for the message
 */
export type LoggerMessageComponent =
  | string
  | { message: string; isBold?: boolean; color: LoggerMessageColor };

/**
 * Standard log levels supported by the logger system.
 */
export type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Interface for logger delegate implementation.
 * This delegate handles the actual printing of log messages, allowing for
 * customization of the underlying logging mechanism.
 */
export interface LoggerDelegate {
  /**
   * Log a message with the specified log level.
   * @param level - The log level (info, warn, error, debug)
   * @param message - The formatted message to log
   */
  log(level: LogLevel, message: string): void;
}

/**
 * Represents the final outcome status of an operation for logging purposes.
 * Used primarily with progress tracking to indicate the result state.
 */
export type LoggerOperationResultType = "success" | "failure" | "warn" | "info";

/**
 * Configuration options for progress tracking.
 *
 * @property actionLabel - The label for the action in progress (e.g., "Analyzing", "Processing")
 * @property successLabel - Optional custom label for successful completion (default: "[actionLabel] completed")
 * @property failureLabel - Optional custom label for failed completion (default: "[actionLabel] failed")
 * @property warnLabel - Optional custom label for warning status (default: "[actionLabel] warning")
 * @property infoLabel - Optional custom label for info status (default: "[actionLabel] info")
 */
export type ProgressOptions = {
  actionLabel: string;
  successLabel?: string;
  failureLabel?: string;
  warnLabel?: string;
  infoLabel?: string;
};

/**
 * Interface for the logger progress indicator.
 * Provides methods to update and complete a progress tracking operation.
 *
 * @property update - Updates the progress message, keeping the same action label
 * @property updateLabel - Updates both the action label and message
 * @property stop - Completes the progress with the specified result type and logs the result
 */
export type LoggerProgress = {
  /**
   * Updates the progress message while keeping the same action label
   * @param components - Message components to display
   */
  update: (...components: LoggerMessageComponent[]) => void;

  /**
   * Updates both the action label and the message
   * @param label - New action label to display
   * @param components - Message components to display
   */
  updateLabel: (label: string, ...components: LoggerMessageComponent[]) => void;

  /**
   * Completes the progress operation with the specified result type
   * @param type - The outcome status (success, failure, warn, info)
   * @param components - Final message components to display
   */
  stop: (
    type: LoggerOperationResultType,
    ...components: LoggerMessageComponent[]
  ) => void;
};

/**
 * Interface for a labeled logger that displays messages with a consistent label.
 * All logging methods will include the specified label with appropriate styling.
 */
export type LabeledLogger = {
  /**
   * Logs an informational message with the specified label
   * @param components - Message components to display
   */
  info: (...components: LoggerMessageComponent[]) => void;

  /**
   * Logs a warning message with the specified label
   * @param components - Message components to display
   */
  warn: (...components: LoggerMessageComponent[]) => void;

  /**
   * Logs an error message with the specified label
   * @param components - Message components to display
   */
  error: (...components: LoggerMessageComponent[]) => void;

  /**
   * Logs a debug message with the specified label
   * @param components - Message components to display
   */
  debug: (...components: LoggerMessageComponent[]) => void;

  /**
   * Creates a progress tracker with the current label.
   * @returns A progress object that can be used to update and complete the progress
   */
  progress: () => LabeledProgress;
};

/**
 * Interface for labeled progress tracking.
 * Provides methods to update and complete a progress operation with a consistent label.
 */
export type LabeledProgress = {
  /**
   * Updates the progress message, keeping the same label
   * @param components - Message components to display
   */
  update: (...components: LoggerMessageComponent[]) => void;

  /**
   * Completes the progress with success status
   * @param components - Final message components to display
   */
  complete: (...components: LoggerMessageComponent[]) => void;

  /**
   * Completes the progress with error status
   * @param components - Final message components to display
   */
  fail: (...components: LoggerMessageComponent[]) => void;
};
