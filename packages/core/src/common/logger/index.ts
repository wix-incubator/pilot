import {
  createLogger,
  format,
  transports,
  Logger as WinstonLogger,
} from "winston";
import ora from "ora";
import chalk from "chalk";
import {
  LoggerMessageComponent,
  LoggerSpinner,
  LoggerMessageColor,
  LoggerOperationResultType,
} from "@/types/logger";
import * as fs from "fs";
import path from "path";
import os from "os";

class Logger {
  private static instance: Logger;
  private readonly logger: WinstonLogger;
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

  private constructor() {
    this.logger = createLogger({
      level: "info",
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.printf(
          ({ timestamp, level, message }) =>
            `[${timestamp}] ${level}: ${message}`,
        ),
      ),
      transports: [new transports.Console()],
    });
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private colorizeMessage(...components: LoggerMessageComponent[]): string {
    return components
      .map((component) => {
        if (typeof component === "string") {
          return chalk.white(component);
        }

        let coloredMessage = chalk[component.color](component.message);

        if (component.isBold) {
          coloredMessage = chalk.bold(coloredMessage);
        }

        return coloredMessage;
      })
      .join(" ");
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

        let message = component.message;

        if (component.isBold) {
          message = `**${message}**`;
        }

        return message;
      })
      .join(" ");
    const timestamp: string = this.formatMessageEntryForLogFile(new Date());
    const levelUpper: string = level.toUpperCase();
    return `[${timestamp}] ${levelUpper}: ${messageText}`;
  }

  private formatMessageEntryForLogFile(date: Date): string {
    const pad = (n: number) => (n < 10 ? "0" + n : n.toString());
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private log(
    level: (typeof this.logLevels)[number],
    ...components: LoggerMessageComponent[]
  ): void {
    const newComponents = components.map((component) => {
      if (typeof component === "string") {
        return {
          message: component,
          isBold: false,
          color: this.colorMap[level],
        };
      }

      return component;
    });

    this.logger[level](this.colorizeMessage(...newComponents));
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

  public startSpinner(...components: LoggerMessageComponent[]): LoggerSpinner {
    const spinner = ora(this.colorizeMessage(...components)).start();

    const stop = (
      result: LoggerOperationResultType,
      ...components: LoggerMessageComponent[]
    ) => {
      spinner.prefixText = "";
      const message = this.colorizeMessage(...components);

      const spinnerActions: Record<LoggerOperationResultType, () => ora.Ora> = {
        success: () => spinner.succeed(message),
        failure: () => spinner.fail(message),
        warn: () => spinner.warn(message),
        info: () => spinner.info(message),
      };

      spinnerActions[result]!();
    };

    const update = (...components: LoggerMessageComponent[]) => {
      spinner.text = this.colorizeMessage(...components);
    };

    return { update, stop };
  }

  public writeLogsToFile(filename: string): void {
    try {
      const tempFilePath = path.join(os.tmpdir(), filename);
      fs.writeFileSync(tempFilePath, this.logs.join("\n"), "utf8");
      this.info(`💾 Logs have been written to ${tempFilePath}`);
    } catch (err) {
      this.error("Failed to write logs to file:", {
        message: `${(err as Error).message}`,
        isBold: false,
        color: "red",
      });
    }
  }
}

export default Logger.getInstance();
