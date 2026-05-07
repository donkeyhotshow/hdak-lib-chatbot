/**
 * Retry logic with exponential backoff
 * Used for network requests that might be temporarily unavailable
 */

import { logger } from "./logger";

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number; // in milliseconds
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 8000,
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Checks if an error is retryable (network error or server error)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Network errors (fetch failed)
    return (
      error.message === "Failed to fetch" ||
      error.message.includes("network") ||
      error.message.includes("fetch") ||
      error.message.includes("offline")
    );
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("network") || message.includes("timeout") || message.includes("econnrefused");
  }

  return false;
}

/**
 * Calculates delay for exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = Math.min(options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1), options.maxDelay);
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.max(100, delay + jitter);
}

/**
 * Retries a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= mergedOptions.maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        logger.info(`API call succeeded after ${attempt - 1} retries`);
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this was the last attempt or error is not retryable, throw
      if (attempt > mergedOptions.maxRetries || !isRetryableError(error)) {
        logger.error(`API call failed after ${attempt} attempts`, lastError, {
          isRetryable: isRetryableError(error),
        });
        throw error;
      }

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, mergedOptions);
      logger.warn(`API call failed, retrying in ${delay}ms (attempt ${attempt}/${mergedOptions.maxRetries})`, {
        error: lastError.message,
      });

      mergedOptions.onRetry?.(attempt, delay, lastError);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error("Unknown error in retry logic");
}

/**
 * Wrapper for fetch with automatic retries
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & RetryOptions
): Promise<Response> {
  const { maxRetries, initialDelay, maxDelay, backoffMultiplier, onRetry, ...fetchOptions } = options || {};

  return withRetry(
    () => fetch(url, fetchOptions),
    { maxRetries, initialDelay, maxDelay, backoffMultiplier, onRetry }
  );
}
