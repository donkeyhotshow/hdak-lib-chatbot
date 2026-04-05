/**
 * Redis Client
 *
 * Returns a connected `ioredis` client when `REDIS_URL` is configured, or
 * `null` otherwise.  Callers that want persistent caching across process
 * restarts should check for a non-null client and fall back to their
 * in-process `NodeCache` when Redis is unavailable.
 *
 * Usage:
 *   import { getRedisClient } from "./_core/redisClient";
 *   const redis = getRedisClient();  // Redis | null
 */

import Redis from "ioredis";
import { ENV } from "./env";
import { logger } from "./logger";

let client: Redis | null = null;
let initialised = false;

/**
 * Return a shared `ioredis` client if `REDIS_URL` is set in the environment,
 * otherwise `null`.  The client is created lazily on the first call and
 * reused for the lifetime of the process.
 */
export function getRedisClient(): Redis | null {
  if (initialised) return client;
  initialised = true;

  if (!ENV.redisUrl) return null;

  try {
    client = new Redis(ENV.redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });

    client.on("error", err => {
      logger.warn("[redisClient] Redis connection error", {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    client.on("connect", () => {
      logger.info("[redisClient] Redis connected");
    });
  } catch (err) {
    logger.warn("[redisClient] Failed to initialise Redis client", {
      error: err instanceof Error ? err.message : String(err),
    });
    client = null;
  }

  return client;
}
