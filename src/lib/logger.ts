/**
 * Simple logging service for client-side monitoring
 * Can be extended with Sentry, LogRocket, or other services
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  error?: Error;
  userAgent?: string;
  url?: string;
}

class Logger {
  private isDevelopment = typeof process !== "undefined" && process.env.NODE_ENV === "development";
  private logs: LogContext[] = [];
  private maxLogs = 100;

  private formatTime(): string {
    return new Date().toISOString();
  }

  private getContext(): Partial<LogContext> {
    return {
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };
  }

  private addLog(context: LogContext): void {
    this.logs.push(context);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatOutput(level: LogLevel, message: string, data?: unknown): void {
    const style = this.getStyle(level);
    const prefix = `[HDAK ${level.toUpperCase()}]`;

    if (this.isDevelopment) {
      if (data !== undefined) {
        console.log(`%c${prefix} ${message}`, style, data);
      } else {
        console.log(`%c${prefix} ${message}`, style);
      }
    }
  }

  private getStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      debug: "color: #7A756F; font-weight: normal;",
      info: "color: #2A2520; font-weight: bold;",
      warn: "color: #D4A853; font-weight: bold;",
      error: "color: #E53E3E; font-weight: bold;",
    };
    return styles[level];
  }

  debug(message: string, data?: unknown): void {
    const context: LogContext = {
      timestamp: this.formatTime(),
      level: "debug",
      message,
      data,
      ...this.getContext(),
    };
    this.addLog(context);
    this.formatOutput("debug", message, data);
  }

  info(message: string, data?: unknown): void {
    const context: LogContext = {
      timestamp: this.formatTime(),
      level: "info",
      message,
      data,
      ...this.getContext(),
    };
    this.addLog(context);
    this.formatOutput("info", message, data);
  }

  warn(message: string, data?: unknown): void {
    const context: LogContext = {
      timestamp: this.formatTime(),
      level: "warn",
      message,
      data,
      ...this.getContext(),
    };
    this.addLog(context);
    this.formatOutput("warn", message, data);
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const contextExtras = this.getContext();
    const context: LogContext = {
      timestamp: this.formatTime(),
      level: "error",
      message,
      error: errorObj,
      data,
      userAgent: contextExtras.userAgent,
      url: contextExtras.url,
    };
    this.addLog(context);
    const outputData: Record<string, unknown> = {
      stack: errorObj.stack,
    };
    if (data && typeof data === "object") {
      Object.assign(outputData, data);
    }
    this.formatOutput("error", `${message}: ${errorObj.message}`, outputData);
  }

  getLogs(): LogContext[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton instance
export const logger = new Logger();
