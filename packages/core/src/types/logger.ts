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
 * Interface for the logger spinner.
 * @property update - Updates the spinner with given components.
 * @property stop - Stops the spinner with given result type and logs the result.
 */
export type LoggerSpinner = {
  update: (...components: LoggerMessageComponent[]) => void;
  stop: (
    type: LoggerOperationResultType,
    ...components: LoggerMessageComponent[]
  ) => void;
};
