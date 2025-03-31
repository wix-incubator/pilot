import chalk from "chalk";
import {
  LoggerMessageComponent,
  LoggerProgress,
  LoggerMessageColor,
  LoggerOperationResultType,
  ProgressOptions,
  LabeledLogger,
  LabeledProgress,
  LoggerDelegate,
} from "@/types/logger";
import * as fs from "fs";
import path from "path";
import os from "os";
import {
  createLogger,
  format,
  transports,
  Logger as WinstonLogger,
} from "winston";

/**
 * Default implementation of LoggerDelegate using Winston
 */
export class DefaultLoggerDelegate implements LoggerDelegate {
  private readonly logger: WinstonLogger;

  constructor() {
    this.logger = createLogger({
      level: "info",
      format: format.combine(format.printf(({ message }) => String(message))),
      transports: [new transports.Console()],
    });
  }

  log(level: "info" | "warn" | "error" | "debug", message: string): void {
    this.logger[level](message);
  }
}

class Logger {
  private static instance: Logger;
  private delegate: LoggerDelegate;
  private readonly logLevels = ["info", "warn", "error", "debug"] as const;
  private readonly colorMap: Record<
    (typeof this.logLevels)[number],
    LoggerMessageColor
  > = {
    info: "whiteBright",
    warn: "yellow",
    error: "red",
    debug: "gray",
  };
  private logs: string[] = [];

  private readonly statusColors = {
    inProgress: "yellow",
    success: "green",
    failure: "red",
    warning: "yellow",
    info: "gray",
  } as const;

  private constructor() {
    this.delegate = new DefaultLoggerDelegate();
  }

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

  private colorizeMessage(...components: LoggerMessageComponent[]): string {
    return components
      .map((component) => {
        if (typeof component === "string") {
          return chalk.white(component);
        }

        const coloredMessage = chalk[component.color](component.message);
        return component.isBold ? chalk.bold(coloredMessage) : coloredMessage;
      })
      .join("");
  }

  private formatTimestamp(date: Date): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : n.toString());
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private formatMessageForLogFile(
    level: string,
    ...components: LoggerMessageComponent[]
  ): string {
    const messageText = components
      .map((component) => {
        if (typeof component === "string") {
          return component;
        }

        const message = component.message;
        return component.isBold ? `**${message}**` : message;
      })
      .join("");

    const timestamp = this.formatTimestamp(new Date());
    return `[${timestamp}] ${level.toUpperCase()}: ${messageText}`;
  }

  private log(
    level: (typeof this.logLevels)[number],
    ...components: LoggerMessageComponent[]
  ): void {
    const processedComponents = components.map((component) => {
      if (typeof component === "string") {
        return {
          message: component,
          isBold: false,
          color: this.colorMap[level],
        };
      }
      return component;
    });

    const colorizedMessage = this.colorizeMessage(...processedComponents);
    this.delegate.log(level, colorizedMessage);
    this.logs.push(this.formatMessageForLogFile(level, ...components));
  }

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
    return {
      info: (...components: LoggerMessageComponent[]): void => {
        this.logWithLabel("info", label, ...components);
      },
      warn: (...components: LoggerMessageComponent[]): void => {
        this.logWithLabel("warn", label, ...components);
      },
      error: (...components: LoggerMessageComponent[]): void => {
        this.logWithLabel("error", label, ...components);
      },
      debug: (...components: LoggerMessageComponent[]): void => {
        this.logWithLabel("debug", label, ...components);
      },

      progress: (): LabeledProgress => {
        this.logWithLabel("info", label, "Starting");
        return {
          update: (...components: LoggerMessageComponent[]): void => {
            // Simply call the logWithLabel method with the original label
            this.logWithLabel("info", label, ...components);
          },

          complete: (...components: LoggerMessageComponent[]): void => {
            // Call logWithLabel with the success color
            this.logWithLabel("info", label, ...components);
          },

          fail: (...components: LoggerMessageComponent[]): void => {
            // Call logWithLabel with the error level
            this.logWithLabel("error", label, ...components);
          },
        };
      },
    };
  }

  private logWithLabel(
    level: (typeof this.logLevels)[number],
    label: string,
    ...components: LoggerMessageComponent[]
  ): void {
    const labelComponent = {
      message: label,
      isBold: true,
      color: this.colorMap[level],
    };

    // Create background color based on log level
    const bgColorMap: Record<string, string> = {
      info: "gray",
      warn: "yellow",
      error: "red",
      debug: "gray",
    };

    const displayLabel = this.createLabel(label, bgColorMap[level]);

    // Process components to ensure proper formatting
    const processedComponents = components.map((component) => {
      if (typeof component === "string") {
        return {
          message: component,
          isBold: false,
          color: this.colorMap[level],
        };
      }
      return component;
    });

    // Log with the appropriate level
    const formattedMessage = `${displayLabel} ${this.colorizeMessage(...processedComponents)}`;
    this.delegate.log(level, formattedMessage);

    // Add to logs
    this.logs.push(
      this.formatMessageForLogFile(level, labelComponent, ...components),
    );
  }

  private createLabel(text: string, bgColor: string): string {
    switch (bgColor) {
      case "gray":
        return chalk.bgGray.black.bold(` ${text} `);
      case "green":
        return chalk.bgGreen.black.bold(` ${text} `);
      case "red":
        return chalk.bgRed.black.bold(` ${text} `);
      case "yellow":
        return chalk.bgYellow.black.bold(` ${text} `);
      case "blue":
        return chalk.bgBlue.black.bold(` ${text} `);
      case "cyan":
        return chalk.bgCyan.black.bold(` ${text} `);
      default:
        return chalk.bgWhite.black.bold(` ${text} `);
    }
  }

  public startProgress(
    options: ProgressOptions,
    ...components: LoggerMessageComponent[]
  ): LoggerProgress {
    const initialMessage = this.colorizeMessage(...components);
    let currentActionLabel = options.actionLabel;

    const displayedLabel = this.createLabel(
      currentActionLabel,
      this.statusColors.inProgress,
    );

    this.logs.push(
      this.formatMessageForLogFile(
        "info",
        `${currentActionLabel} ${initialMessage}`,
      ),
    );

    this.delegate.log("info", `${displayedLabel} ${initialMessage}`);

    const stop = (
      result: LoggerOperationResultType,
      ...components: LoggerMessageComponent[]
    ) => {
      const message = this.colorizeMessage(...components);

      const labelText = {
        success: options.successLabel || `${currentActionLabel} completed`,
        failure: options.failureLabel || `${currentActionLabel} failed`,
        warn: options.warnLabel || `${currentActionLabel} warning`,
        info: options.infoLabel || `${currentActionLabel} info`,
      }[result];

      const resultColors = {
        success: this.statusColors.success,
        failure: this.statusColors.failure,
        warn: this.statusColors.warning,
        info: this.statusColors.info,
      };

      const resultLabel = this.createLabel(labelText, resultColors[result]);
      const logMethod = this.getLogMethodForResult(result);
      const resultMessage = `${resultLabel} ${message}`;

      this.delegate.log(logMethod, resultMessage);
      this.logs.push(
        this.formatMessageForLogFile(logMethod, `${labelText} ${message}`),
      );
    };

    const update = (...components: LoggerMessageComponent[]) => {
      const updatedMessage = this.colorizeMessage(...components);
      const displayedLabel = this.createLabel(
        currentActionLabel,
        this.statusColors.inProgress,
      );

      this.logs.push(
        this.formatMessageForLogFile(
          "info",
          `${currentActionLabel} ${updatedMessage}`,
        ),
      );

      this.delegate.log("info", `${displayedLabel} ${updatedMessage}`);
    };

    const updateLabel = (
      label: string,
      ...components: LoggerMessageComponent[]
    ) => {
      currentActionLabel = label;
      const updatedMessage = this.colorizeMessage(...components);
      const displayedLabel = this.createLabel(
        currentActionLabel,
        this.statusColors.inProgress,
      );

      this.logs.push(
        this.formatMessageForLogFile(
          "info",
          `${currentActionLabel} ${updatedMessage}`,
        ),
      );

      this.delegate.log("info", `${displayedLabel} ${updatedMessage}`);
    };

    return { update, updateLabel, stop };
  }

  private getLogMethodForResult(
    result: LoggerOperationResultType,
  ): "info" | "warn" | "error" {
    if (result === "failure") return "error";
    if (result === "warn") return "warn";
    return "info";
  }

  public writeLogsToFile(filename: string): void {
    try {
      const tempFilePath = path.join(os.tmpdir(), filename);
      fs.writeFileSync(tempFilePath, this.logs.join("\n"), "utf8");
      this.labeled("SAVED").info(`Logs have been written to ${tempFilePath}`);
    } catch (err) {
      this.labeled("ERROR").error(
        `Failed to write logs to file: ${(err as Error).message}`,
      );
    }
  }
}

// Export the singleton instance
const logger = Logger.getInstance();

// Export the logger object and the default delegate class for users to extend
export default logger;
