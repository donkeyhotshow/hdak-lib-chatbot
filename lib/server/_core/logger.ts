/**
 * Minimal structured logger.
 * Writes JSON lines to stdout/stderr so the output can be piped to
 * any log aggregator without requiring an additional dependency.
 *
 * `logger.milestone()` outputs a visually distinct banner for key system events
 * (server start, successful sync, cache invalidation) that are easy to spot in
 * plain console output during a live demonstration.
 */

import { ENV } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";
const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getConfiguredLogLevel(): LogLevel {
  const value = (
    process.env.LOG_LEVEL ||
    ENV.logLevel ||
    "debug"
  ).toLowerCase();
  if (value === "debug" || value === "info" || value === "warn") return value;
  return "error";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_PRIORITY[level] >= LOG_PRIORITY[getConfiguredLogLevel()];
}

function log(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (!shouldLog(level)) return;
  const entry: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    msg: message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

/**
 * Print a visually prominent banner for important system lifecycle events.
 * Output format (plain text, not JSON) makes it easy to spot in console logs
 * during demos or presentations.
 */
function milestone(message: string, meta?: Record<string, unknown>): void {
  const bar = "═".repeat(60);
  const ts = new Date().toISOString();
  const suffix = meta ? " " + JSON.stringify(meta) : "";
  console.log(`\n╔${bar}╗`);
  console.log(`║  ★ SYSTEM  ${ts}`);
  console.log(`║  ${message}${suffix}`);
  console.log(`╚${bar}╝\n`);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    log("error", msg, meta),
  milestone,
};
