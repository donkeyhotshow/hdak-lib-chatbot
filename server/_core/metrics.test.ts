import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  recordLatency,
  getLatencyStats,
  recordStreamOutcome,
  getStreamingStats,
  startMemoryMonitoring,
  stopMemoryMonitoring,
  getMemorySnapshots,
  getCurrentMemory,
  getMetrics,
  _resetMetrics,
} from "./metrics";

beforeEach(() => {
  _resetMetrics();
});

afterEach(() => {
  stopMemoryMonitoring();
});

// ── Latency ──────────────────────────────────────────────────────────────────

describe("recordLatency / getLatencyStats", () => {
  it("returns null percentiles when no samples exist", () => {
    const stats = getLatencyStats();
    expect(stats.samples).toBe(0);
    expect(stats.p50Ms).toBeNull();
    expect(stats.p95Ms).toBeNull();
    expect(stats.p99Ms).toBeNull();
  });

  it("records a single sample and returns it as all percentiles", () => {
    recordLatency(100);
    const stats = getLatencyStats();
    expect(stats.samples).toBe(1);
    expect(stats.p50Ms).toBe(100);
    expect(stats.p95Ms).toBe(100);
    expect(stats.p99Ms).toBe(100);
  });

  it("computes correct percentiles for a sorted sequence", () => {
    for (let i = 1; i <= 100; i++) {
      recordLatency(i); // 1..100 ms
    }
    const stats = getLatencyStats();
    expect(stats.samples).toBe(100);
    // p50 of [1..100] = value at index ceil(50/100 * 100) - 1 = 49 → 50
    expect(stats.p50Ms).toBe(50);
    // p95 of [1..100] = value at index ceil(95/100 * 100) - 1 = 94 → 95
    expect(stats.p95Ms).toBe(95);
    // p99 of [1..100] = value at index ceil(99/100 * 100) - 1 = 98 → 99
    expect(stats.p99Ms).toBe(99);
  });

  it("caps sample count at MAX_LATENCY_SAMPLES (500) and keeps most recent values", () => {
    // Fill beyond capacity
    for (let i = 0; i < 600; i++) {
      recordLatency(i);
    }
    const stats = getLatencyStats();
    expect(stats.samples).toBe(500);
  });
});

// ── Streaming counters ────────────────────────────────────────────────────────

describe("recordStreamOutcome / getStreamingStats", () => {
  it("starts with zeroed counters", () => {
    const stats = getStreamingStats();
    expect(stats.total).toBe(0);
    expect(stats.success).toBe(0);
    expect(stats.error).toBe(0);
    expect(stats.timeout).toBe(0);
    expect(stats.errorRate).toBeNull();
  });

  it("counts successes correctly", () => {
    recordStreamOutcome("success");
    recordStreamOutcome("success");
    const stats = getStreamingStats();
    expect(stats.total).toBe(2);
    expect(stats.success).toBe(2);
    expect(stats.errorRate).toBe(0);
  });

  it("counts errors and computes error rate", () => {
    recordStreamOutcome("success");
    recordStreamOutcome("error");
    const stats = getStreamingStats();
    expect(stats.total).toBe(2);
    expect(stats.error).toBe(1);
    expect(stats.errorRate).toBe(0.5);
  });

  it("counts timeouts and includes them in error rate", () => {
    recordStreamOutcome("success");
    recordStreamOutcome("timeout");
    const stats = getStreamingStats();
    expect(stats.timeout).toBe(1);
    expect(stats.errorRate).toBe(0.5);
  });

  it("accumulates all three outcomes", () => {
    recordStreamOutcome("success");
    recordStreamOutcome("error");
    recordStreamOutcome("timeout");
    const stats = getStreamingStats();
    expect(stats.total).toBe(3);
    expect(stats.success).toBe(1);
    expect(stats.error).toBe(1);
    expect(stats.timeout).toBe(1);
    expect(stats.errorRate).toBeCloseTo(2 / 3);
  });
});

// ── Memory snapshots ──────────────────────────────────────────────────────────

describe("startMemoryMonitoring / getMemorySnapshots", () => {
  it("takes an initial snapshot immediately on start", () => {
    expect(getMemorySnapshots()).toHaveLength(0);
    startMemoryMonitoring();
    expect(getMemorySnapshots().length).toBeGreaterThanOrEqual(1);
  });

  it("is idempotent (second call does not double-register timer)", () => {
    startMemoryMonitoring();
    startMemoryMonitoring(); // should not throw or add duplicate timer
    expect(getMemorySnapshots().length).toBe(1);
  });

  it("snapshot has expected shape", () => {
    startMemoryMonitoring();
    const snap = getCurrentMemory()!;
    expect(snap).not.toBeNull();
    expect(typeof snap.heapUsedMb).toBe("number");
    expect(typeof snap.heapTotalMb).toBe("number");
    expect(typeof snap.rssMb).toBe("number");
    expect(typeof snap.externalMb).toBe("number");
    expect(snap.heapUsedMb).toBeGreaterThan(0);
  });

  it("returns null from getCurrentMemory when no snapshots exist", () => {
    expect(getCurrentMemory()).toBeNull();
  });
});

// ── Aggregate metrics ─────────────────────────────────────────────────────────

describe("getMetrics", () => {
  it("returns a complete metrics object", () => {
    recordLatency(200);
    recordStreamOutcome("success");
    startMemoryMonitoring();

    const m = getMetrics();
    expect(m.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(m.uptime.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(m.latency.samples).toBe(1);
    expect(m.streaming.total).toBe(1);
    expect(m.memory.current).not.toBeNull();
    expect(Array.isArray(m.memory.history)).toBe(true);
  });

  it("reflects reset state after _resetMetrics", () => {
    recordLatency(500);
    recordStreamOutcome("error");
    _resetMetrics();

    const m = getMetrics();
    expect(m.latency.samples).toBe(0);
    expect(m.streaming.total).toBe(0);
    expect(m.memory.history).toHaveLength(0);
  });
});
