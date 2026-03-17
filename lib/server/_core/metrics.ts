/**
 * In-process production metrics.
 *
 * Tracks three key signals that commonly break AI chatbots after release:
 *   1. Latency  — p50 / p95 / p99 of /api/chat streaming requests.
 *   2. Memory   — Node.js heap / rss snapshots sampled periodically.
 *   3. Streaming stability — counts of successful, errored, and timed-out streams.
 *
 * All data is kept in-process (no external service required) and exposed via
 * the GET /api/metrics admin endpoint.
 */

/** Maximum number of latency samples to retain (ring buffer). */
const MAX_LATENCY_SAMPLES = 500;

/** Memory snapshot interval (ms). */
const MEMORY_SNAPSHOT_INTERVAL_MS = 60_000;

/** Maximum number of memory snapshots to retain. */
const MAX_MEMORY_SNAPSHOTS = 60;

// ── Latency ───────────────────────────────────────────────────────────────────

/** Circular buffer of recent latency values in milliseconds. */
const latencySamples: number[] = [];
let latencyHead = 0;
let latencyCount = 0;

/**
 * Add a new latency sample (ms) to the ring buffer.
 * Thread-safety is not a concern here: Node.js event loop is single-threaded.
 */
export function recordLatency(ms: number): void {
  if (latencyCount < MAX_LATENCY_SAMPLES) {
    latencySamples[latencyCount] = ms;
    latencyCount++;
    latencyHead = latencyCount;
  } else {
    latencySamples[latencyHead % MAX_LATENCY_SAMPLES] = ms;
    latencyHead++;
  }
}

/** Compute a percentile (0–100) over the current latency sample set. */
function percentile(p: number): number | null {
  const count = Math.min(latencyCount, MAX_LATENCY_SAMPLES);
  if (count === 0) return null;
  const sorted = latencySamples.slice(0, count).sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export interface LatencyStats {
  samples: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
}

export function getLatencyStats(): LatencyStats {
  return {
    samples: Math.min(latencyCount, MAX_LATENCY_SAMPLES),
    p50Ms: percentile(50),
    p95Ms: percentile(95),
    p99Ms: percentile(99),
  };
}

// ── Streaming counters ────────────────────────────────────────────────────────

export type StreamOutcome = "success" | "error" | "timeout";

interface StreamCounters {
  total: number;
  success: number;
  error: number;
  timeout: number;
}

const streamCounters: StreamCounters = {
  total: 0,
  success: 0,
  error: 0,
  timeout: 0,
};

/** Record the outcome of a single streaming request. */
export function recordStreamOutcome(outcome: StreamOutcome): void {
  streamCounters.total++;
  streamCounters[outcome]++;
}

export interface StreamingStats {
  total: number;
  success: number;
  error: number;
  timeout: number;
  /** Error rate 0–1, or null when there are no requests yet. */
  errorRate: number | null;
}

export function getStreamingStats(): StreamingStats {
  const { total, success, error, timeout } = streamCounters;
  return {
    total,
    success,
    error,
    timeout,
    errorRate: total > 0 ? (error + timeout) / total : null,
  };
}

// ── Memory snapshots ──────────────────────────────────────────────────────────

export interface MemorySnapshot {
  timestamp: string;
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
}

const memorySnapshots: MemorySnapshot[] = [];
let memoryTimer: ReturnType<typeof setInterval> | null = null;

function takeMemorySnapshot(): void {
  const mem = process.memoryUsage();
  const snap: MemorySnapshot = {
    timestamp: new Date().toISOString(),
    heapUsedMb: mem.heapUsed / 1_048_576,
    heapTotalMb: mem.heapTotal / 1_048_576,
    rssMb: mem.rss / 1_048_576,
    externalMb: mem.external / 1_048_576,
  };
  if (memorySnapshots.length >= MAX_MEMORY_SNAPSHOTS) {
    memorySnapshots.shift();
  }
  memorySnapshots.push(snap);
}

/**
 * Start the periodic memory snapshot timer.
 * Idempotent — safe to call multiple times.
 */
export function startMemoryMonitoring(): void {
  if (memoryTimer !== null) return;
  takeMemorySnapshot(); // capture initial snapshot immediately
  memoryTimer = setInterval(takeMemorySnapshot, MEMORY_SNAPSHOT_INTERVAL_MS);
  // Allow the Node.js event loop to exit even when this timer is active
  memoryTimer.unref();
}

/** Stop the periodic memory snapshot timer (used in tests). */
export function stopMemoryMonitoring(): void {
  if (memoryTimer !== null) {
    clearInterval(memoryTimer);
    memoryTimer = null;
  }
}

/** Return a copy of all memory snapshots, most recent last. */
export function getMemorySnapshots(): MemorySnapshot[] {
  return [...memorySnapshots];
}

/** Return the most recent memory snapshot, or null if none exists. */
export function getCurrentMemory(): MemorySnapshot | null {
  return memorySnapshots.length > 0
    ? memorySnapshots[memorySnapshots.length - 1]
    : null;
}

// ── Aggregate metrics ─────────────────────────────────────────────────────────

export interface Metrics {
  collectedAt: string;
  uptime: { uptimeSeconds: number };
  latency: LatencyStats;
  streaming: StreamingStats;
  usage: {
    openRouter: {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      lastModel: string | null;
    };
  };
  memory: {
    current: MemorySnapshot | null;
    history: MemorySnapshot[];
  };
}

interface OpenRouterUsageCounters {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  lastModel: string | null;
}

const openRouterUsage: OpenRouterUsageCounters = {
  requests: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  estimatedCostUsd: 0,
  lastModel: null,
};

function readPriceFromEnv(key: string): number {
  const raw = process.env[key];
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function estimateOpenRouterCostUsd(inputTokens: number, outputTokens: number) {
  const inputCostPer1M = readPriceFromEnv(
    "OPENROUTER_INPUT_COST_USD_PER_1M_TOKENS"
  );
  const outputCostPer1M = readPriceFromEnv(
    "OPENROUTER_OUTPUT_COST_USD_PER_1M_TOKENS"
  );
  return (
    (inputTokens / 1_000_000) * inputCostPer1M +
    (outputTokens / 1_000_000) * outputCostPer1M
  );
}

export function recordModelUsage(params: {
  provider: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
}) {
  if (params.provider !== "openrouter") return;
  const inputTokens = Math.max(0, Math.floor(params.inputTokens ?? 0));
  const outputTokens = Math.max(0, Math.floor(params.outputTokens ?? 0));
  const totalTokens = Math.max(
    Math.floor(params.totalTokens ?? 0),
    inputTokens + outputTokens
  );
  openRouterUsage.requests += 1;
  openRouterUsage.inputTokens += inputTokens;
  openRouterUsage.outputTokens += outputTokens;
  openRouterUsage.totalTokens += totalTokens;
  openRouterUsage.estimatedCostUsd += estimateOpenRouterCostUsd(
    inputTokens,
    outputTokens
  );
  openRouterUsage.lastModel = params.model || null;
}

/** Return a full metrics snapshot. */
export function getMetrics(): Metrics {
  return {
    collectedAt: new Date().toISOString(),
    uptime: { uptimeSeconds: Math.floor(process.uptime()) },
    latency: getLatencyStats(),
    streaming: getStreamingStats(),
    usage: {
      openRouter: { ...openRouterUsage },
    },
    memory: {
      current: getCurrentMemory(),
      history: getMemorySnapshots(),
    },
  };
}

// ── Test helpers ──────────────────────────────────────────────────────────────

/** Reset all counters and buffers — for use in tests only. */
export function _resetMetrics(): void {
  latencySamples.length = 0;
  latencyHead = 0;
  latencyCount = 0;
  streamCounters.total = 0;
  streamCounters.success = 0;
  streamCounters.error = 0;
  streamCounters.timeout = 0;
  openRouterUsage.requests = 0;
  openRouterUsage.inputTokens = 0;
  openRouterUsage.outputTokens = 0;
  openRouterUsage.totalTokens = 0;
  openRouterUsage.estimatedCostUsd = 0;
  openRouterUsage.lastModel = null;
  memorySnapshots.length = 0;
  stopMemoryMonitoring();
}
