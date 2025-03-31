/**
 * Optional color for the logger message.
 */
export declare type LoggerMessageColor =
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
 * Logger message component, subsequent messages will be concatenated. String components will be white colored.
 * @property message - The message to log.
 * @property isBold - Whether to make the message bold.
 * @property color - The color to use for the message.
 */
export type LoggerMessageComponent =
  | string
  | { message: string; isBold?: boolean; color: LoggerMessageColor };

/**
 * Operation outcome type.
 */
export type LoggerOperationResultType = "success" | "failure" | "warn" | "info";

/**
 * Options for progress tracking.
 * @property actionLabel - The label for the action in progress (e.g., "Analyzing", "Processing")
 * @property successLabel - The label for successful completion (e.g., "Analyzed", "Processed")
 * @property failureLabel - The label for failed completion (e.g., "Failed to analyze", "Processing failed")
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
 * @property update - Updates the progress message, keeping the same action label.
 * @property updateLabel - Updates both the action label and message.
 * @property stop - Stops the progress with given result type and logs the result.
 */
export type LoggerProgress = {
  update: (...components: LoggerMessageComponent[]) => void;
  updateLabel: (label: string, ...components: LoggerMessageComponent[]) => void;
  stop: (
    type: LoggerOperationResultType,
    ...components: LoggerMessageComponent[]
  ) => void;
};

/**
 * Interface for the labeled logger.
 * Returns logging methods that will display the specified label with appropriate styling.
 */
export type LabeledLogger = {
  info: (...components: LoggerMessageComponent[]) => void;
  warn: (...components: LoggerMessageComponent[]) => void;
  error: (...components: LoggerMessageComponent[]) => void;
  debug: (...components: LoggerMessageComponent[]) => void;
  
  /**
   * Creates a progress tracker with the current label.
   * @returns A progress object that can be used to update and complete the progress
   */
  progress: () => LabeledProgress;
};

/**
 * Interface for labeled progress tracking.
 * Allows for updating progress with the same label.
 */
export type LabeledProgress = {
  /**
   * Updates the progress message, keeping the same label.
   */
  update: (...components: LoggerMessageComponent[]) => void;
  
  /**
   * Completes the progress with success status.
   */
  complete: (...components: LoggerMessageComponent[]) => void;
  
  /**
   * Completes the progress with error status.
   */
  fail: (...components: LoggerMessageComponent[]) => void;
};
