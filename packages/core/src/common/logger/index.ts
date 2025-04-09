import chalk from "chalk";
import path from "path";
import { getCurrentTestFilePath } from "@/common/cacheHandler/testEnvUtils";
import {
  LoggerMessageComponent,
  LoggerProgress,
  LoggerMessageColor,
  LoggerOperationResultType,
  ProgressOptions,
  LabeledLogger,
  LoggerDelegate,
  LogLevel,
} from "@/types/logger";
import {
  createLogger,
  format,
  transports,
  Logger as WinstonLogger,
} from "winston";
import { Writable } from "stream";
import { findProjectRoot, getRelativePath } from "./pathUtils";

/**
 * Default logger delegate implementation using Winston
 * Provides clean, formatted output to the console
 */
export class DefaultLoggerDelegate implements LoggerDelegate {
  private readonly logger: WinstonLogger;

  constructor() {
    // Create a custom output stream that writes directly to stdout
    // This completely bypasses console.log
    const outputStream = new Writable({
      write(chunk, encoding, callback) {
        process.stdout.write(chunk);
        callback();
      },
    });

    // Create a custom transport using our direct stdout stream
    const directStdoutTransport = new transports.Stream({
      stream: outputStream,
      format: format.printf(({ message }) => String(message)),
    });

    // Create the Winston logger with minimal formatting
    this.logger = createLogger({
      level: "info",
      format: format.printf(({ message }) => String(message)),
      transports: [directStdoutTransport],
    });
  }

  /**
   * Log a message at the specified level
   * @param level The log level (info, warn, error, debug)
   * @param message The formatted message to log
   */
  log(level: LogLevel, message: string): void {
    this.logger[level](message);
  }
}

/**
 * Core Logger implementation with singleton pattern
 */
class Logger {
  private static instance: Logger;
  private delegate: LoggerDelegate;
  private projectRootCache = new Map<string, string | null>();

  private readonly logLevels: readonly LogLevel[] = [
    "info",
    "warn",
    "error",
    "debug",
  ];

  private readonly colorMap: Record<LogLevel, LoggerMessageColor> = {
    info: "whiteBright",
    warn: "yellow",
    error: "red",
    debug: "gray",
  };

  private readonly statusColors = {
    inProgress: "yellow",
    success: "green",
    failure: "red",
    warning: "yellow",
    info: "gray",
  } as const;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.delegate = new DefaultLoggerDelegate();
  }

  /**
   * Get the singleton instance of the Logger
   * @returns The Logger instance
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set a custom logger delegate
   * @param delegate The delegate implementation to use for logging
   */
  public setDelegate(delegate: LoggerDelegate): void {
    this.delegate = delegate;
  }

  /**
   * Get the current logger delegate
   * @returns Current delegate implementation
   */
  public getDelegate(): LoggerDelegate {
    return this.delegate;
  }

  /**
   * Convert message components to a colorized string
   * Applies colors and formatting to log components
   * @param components Array of message components to colorize
   * @returns Formatted string with ANSI color codes
   */
  private colorizeMessage(...components: LoggerMessageComponent[]): string {
    return components
      .map((component) => {
        if (typeof component === "string") {
          return chalk.white(component);
        }
        const { message, isBold, color } = component;
        const colorFn = chalk[color || "white"];
        return isBold ? colorFn.bold(message) : colorFn(message);
      })
      .join("");
  }

  /**
   * Format a message for log file output (plain text without colors)
   * @param level Log level
   * @param components Message components
   * @returns Plain text formatted message for file output
   */
  /**
   * Core logging method that all other log methods use
   * Creates a formatted log component from a text string
   * @param text The message text
   * @param level Log level to determine text color
   * @param isBold Whether the text should be bold
   * @returns Formatted log component
   */
  private createComponent(
    text: string,
    level: LogLevel,
    isBold = false,
  ): LoggerMessageComponent {
    return {
      message: text,
      isBold,
      color: this.colorMap[level],
    };
  }

  /**
   * Creates components for the test file label if in a test environment
   * @returns Array of components for the test file label or empty array if not in a test
   */
  private createTestFileComponents(): LoggerMessageComponent[] {
    const filePath = getCurrentTestFilePath();
    if (!filePath) {
      return [];
    }

    let projectRoot = this.projectRootCache.get(filePath);

    if (projectRoot === undefined) {
      projectRoot = findProjectRoot(filePath);
      this.projectRootCache.set(filePath, projectRoot);
    }

    if (projectRoot) {
      const relativePath = getRelativePath(filePath, projectRoot);
      const dirname = path.dirname(relativePath);
      const basename = path.basename(relativePath);

      const dirLabel = dirname === "." ? "" : `${dirname}${path.sep}`;

      return [
        { message: dirLabel, color: "gray" },
        { message: basename, color: "white", isBold: true },
        "\n",
      ];
    } else {
      const basename = path.basename(filePath);
      return [{ message: basename, color: "white", isBold: true }, "\n"];
    }
  }

  /**
   * Converts string messages to properly formatted log components
   * @param components Raw message components (strings or formatted components)
   * @param level Log level to apply styling
   * @returns Array of properly formatted log components
   */
  private normalizeComponents(
    components: LoggerMessageComponent[],
    level: LogLevel,
  ): LoggerMessageComponent[] {
    return components.map((component) =>
      typeof component === "string"
        ? this.createComponent(component, level)
        : component,
    );
  }

  /**
   * Formats and sends log message to the delegate
   * This is the core logging implementation used by all logging methods
   * @param level Log level
   * @param components Message components
   * @param prefix Optional prefix to prepend to the message
   */
  private formatAndSend(
    level: LogLevel,
    components: LoggerMessageComponent[],
    prefix?: string,
  ): void {
    const normalizedComponents = this.normalizeComponents(components, level);
    const messageComponents: LoggerMessageComponent[] = [];

    if (prefix) {
      messageComponents.push({
        message: `${prefix} `,
        color: "white",
      });
    }

    const fileComponents = this.createTestFileComponents();
    if (fileComponents.length > 0) {
      messageComponents.push(...fileComponents);
    }

    messageComponents.push(...normalizedComponents);

    const formattedMessage = this.colorizeMessage(...messageComponents);
    this.delegate.log(level, formattedMessage);
  }

  private log(level: LogLevel, ...components: LoggerMessageComponent[]): void {
    this.formatAndSend(level, components);
  }

  /**
   * Log an informational message
   * @param components Message components
   */
  public info(...components: LoggerMessageComponent[]): void {
    this.log("info", ...components);
  }
  public warn(...components: LoggerMessageComponent[]): void {
    this.log("warn", ...components);
  }
  public error(...components: LoggerMessageComponent[]): void {
    this.log("error", ...components);
  }
  public debug(...components: LoggerMessageComponent[]): void {
    this.log("debug", ...components);
  }

  public labeled(label: string): LabeledLogger {
    const createMethod =
      (level: LogLevel) =>
      (...c: LoggerMessageComponent[]) =>
        this.logWithLabel(level, label, ...c);

    return {
      info: createMethod("info"),
      warn: createMethod("warn"),
      error: createMethod("error"),
      debug: createMethod("debug"),
      progress: () => {
        this.logWithLabel("info", label, "Starting");
        return {
          update: createMethod("info"),
          complete: createMethod("info"),
          fail: createMethod("error"),
        };
      },
    };
  }

  /**
   * Log a message with a formatted label prefix
   * @param level Log level
   * @param label The label to display
   * @param components Message components
   */
  private logWithLabel(
    level: LogLevel,
    label: string,
    ...components: LoggerMessageComponent[]
  ): void {
    const bgColorMap: Record<LogLevel, string> = {
      info: "gray",
      warn: "yellow",
      error: "red",
      debug: "gray",
    };

    const displayLabel = this.createLabel(label, bgColorMap[level]);
    this.formatAndSend(level, components, displayLabel);
  }

  /**
   * Create a styled background label
   * @param text The label text
   * @param bgColor Background color for the label
   * @returns Formatted label string with ANSI color codes
   */
  private createLabel(text: string, bgColor: string): string {
    const colorMap = {
      gray: chalk.bgGray,
      green: chalk.bgGreen,
      red: chalk.bgRed,
      yellow: chalk.bgYellow,
      blue: chalk.bgBlue,
      cyan: chalk.bgCyan,
    };
    return (
      colorMap[bgColor as keyof typeof colorMap] || chalk.bgWhite
    ).black.bold(` ${text} `);
  }

  /**
   * Start a progress tracking operation
   * @param options Progress configuration options
   * @param components Initial message components
   * @returns Progress control object
   */
  public startProgress(
    options: ProgressOptions,
    ...components: LoggerMessageComponent[]
  ): LoggerProgress {
    let currentActionLabel = options.actionLabel || "Progress";

    this.logProgress(
      currentActionLabel,
      this.statusColors.inProgress,
      "info",
      components,
    );

    return {
      update: (...components) => {
        return this.logProgress(
          currentActionLabel,
          this.statusColors.inProgress,
          "info",
          components,
        );
      },
      updateLabel: (label, ...components) => {
        currentActionLabel = label;
        this.logProgress(
          currentActionLabel,
          this.statusColors.inProgress,
          "info",
          components,
        );
      },
      stop: (result, ...components) => {
        const resultMap = {
          success: {
            label: options.successLabel || `${currentActionLabel} completed`,
            color: this.statusColors.success,
          },
          failure: {
            label: options.failureLabel || `${currentActionLabel} failed`,
            color: this.statusColors.failure,
          },
          warn: {
            label: options.warnLabel || `${currentActionLabel} warning`,
            color: this.statusColors.warning,
          },
        };

        const { label, color } =
          resultMap[result as keyof typeof resultMap] || resultMap.warn;
        const logLevel = this.getLogMethodForResult(result);
        this.logProgress(label, color, logLevel, components);
      },
    };
  }

  /**
   * Log a progress message with a styled label
   * @param labelText Text for the progress label
   * @param labelColor Background color for the label
   * @param level Log level
   * @param components Message components
   */
  private logProgress(
    labelText: string,
    labelColor: string,
    level: LogLevel,
    components: LoggerMessageComponent[] = [],
  ): void {
    const displayLabel = this.createLabel(labelText, labelColor);
    this.formatAndSend(level, components, displayLabel);
  }

  /**
   * Map operation result type to appropriate log level
   * @param result The operation result type
   * @returns The corresponding log level
   */
  private getLogMethodForResult(result: LoggerOperationResultType): LogLevel {
    return result === "failure" ? "error" : result === "warn" ? "warn" : "info";
  }
}

// Export the singleton instance
const logger = Logger.getInstance();

// Export the logger object and the default delegate class for users to extend
export default logger;
