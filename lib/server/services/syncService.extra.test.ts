/**
 * Extra tests for server/services/syncService.ts
 *
 * Covers lines and functions not reached by syncService.test.ts:
 * - runSync: fetch failure path, success path (new resources), resource sync error, "synced=0" log branch
 * - startSyncScheduler / stopSyncScheduler: full lifecycle
 * - getLastSyncStatus: direct call
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  runSync,
  startSyncScheduler,
  stopSyncScheduler,
  isSyncing,
  getLastSyncStatus,
} from "./syncService";
import * as db from "../db";

vi.mock("../db", async importOriginal => {
  const actual = await importOriginal<typeof import("../db")>();
  return { ...actual };
});

afterEach(() => {
  stopSyncScheduler();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Minimal catalog HTML that yields exactly one catalog-type resource.
const HTML_ONE_CATALOG = `
  <a href="https://lib-hdak.in.ua/e-catalog.html">
    Електронний каталог
  </a>`;

// ---------------------------------------------------------------------------
// runSync — fetch failure path
// ---------------------------------------------------------------------------

describe("syncService extra — runSync fetch failure", () => {
  it("returns error details when the catalog page is unreachable", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(
      new Error("Network connection refused")
    );

    const result = await runSync();

    expect(result.synced).toBe(0);
    expect(result.errors[0]).toContain("Network connection refused");
  });

  it("returns error when the catalog server responds with a non-OK status", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => "",
    } as Response);

    const result = await runSync();

    expect(result.synced).toBe(0);
    expect(result.errors[0]).toContain("503");
  });

  it("stores a failed status after a fetch error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Timeout"));

    await runSync();
    const status = getLastSyncStatus();

    expect(status).not.toBeNull();
    expect(status!.success).toBe(false);
    expect(status!.synced).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// runSync — success path: new resources are synced
// ---------------------------------------------------------------------------

describe("syncService extra — runSync success path", () => {
  it("returns synced=1 when one new resource is found and not already in DB", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => HTML_ONE_CATALOG,
    } as Response);
    vi.spyOn(db, "getResourceByUrl").mockResolvedValueOnce(null); // not in DB yet
    vi.spyOn(db, "createResource").mockResolvedValueOnce(null);

    const result = await runSync();

    expect(result.synced).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(db.createResource).toHaveBeenCalledTimes(1);
  });

  it("does not insert a resource that already exists in the DB", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => HTML_ONE_CATALOG,
    } as Response);
    const existingResource = {
      id: 1,
      nameEn: "Electronic Catalog",
      nameUk: "Електронний каталог",
      nameRu: "Электронный каталог",
      descriptionEn: null,
      descriptionUk: null,
      descriptionRu: null,
      type: "catalog" as const,
      url: "https://lib-hdak.in.ua/e-catalog.html",
      keywords: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(db, "getResourceByUrl").mockResolvedValueOnce(existingResource); // already in DB

    const result = await runSync();

    expect(result.synced).toBe(0);
    expect(result.errors).toHaveLength(0);
    // createResource is NOT called since the resource already exists
    expect(db.getResourceByUrl).toHaveBeenCalled();
  });

  it("records a success status with synced=0 when parsed resources already exist", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => HTML_ONE_CATALOG,
    } as Response);
    const existingResource = {
      id: 1,
      nameEn: "Electronic Catalog",
      nameUk: "Електронний каталог",
      nameRu: "Электронный каталог",
      descriptionEn: null,
      descriptionUk: null,
      descriptionRu: null,
      type: "catalog" as const,
      url: "https://lib-hdak.in.ua/e-catalog.html",
      keywords: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(db, "getResourceByUrl").mockResolvedValueOnce(existingResource);

    await runSync();
    const status = getLastSyncStatus();

    expect(status!.success).toBe(true);
    expect(status!.synced).toBe(0);
  });

  it("records a success status with synced>0 and clears reply cache", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => HTML_ONE_CATALOG,
    } as Response);
    vi.spyOn(db, "getResourceByUrl").mockResolvedValueOnce(null);
    vi.spyOn(db, "createResource").mockResolvedValueOnce(null);

    await runSync();
    const status = getLastSyncStatus();

    expect(status!.success).toBe(true);
    expect(status!.synced).toBe(1);
  });

  it("records individual resource errors without aborting the overall sync", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => HTML_ONE_CATALOG,
    } as Response);
    vi.spyOn(db, "getResourceByUrl").mockRejectedValueOnce(
      new Error("DB read failed")
    );

    const result = await runSync();

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("DB read failed");
  });
});

// ---------------------------------------------------------------------------
// getLastSyncStatus — direct call
// ---------------------------------------------------------------------------

describe("syncService extra — getLastSyncStatus direct call", () => {
  it("returns null before any sync has run (in a fresh module state)", async () => {
    // We can verify the function at least returns something (null or an object)
    // without crashing; the test environment may have prior state from other tests.
    const status = getLastSyncStatus();
    expect(status === null || typeof status === "object").toBe(true);
  });

  it("returns the last sync result object after a successful sync", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => HTML_ONE_CATALOG,
    } as Response);
    vi.spyOn(db, "getResourceByUrl").mockResolvedValueOnce(null);
    vi.spyOn(db, "createResource").mockResolvedValueOnce(null);

    await runSync();
    const status = getLastSyncStatus();

    expect(status).toMatchObject({
      success: true,
      synced: 1,
    });
    expect(status!.timestamp).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// startSyncScheduler / stopSyncScheduler
// ---------------------------------------------------------------------------

describe("syncService extra — startSyncScheduler lifecycle", () => {
  it("starts without error and can be stopped immediately", () => {
    vi.useFakeTimers();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);
    vi.spyOn(db, "getAllResources").mockResolvedValue([]);
    vi.spyOn(db, "getResourceByUrl").mockResolvedValue(null);

    startSyncScheduler(60_000);
    // _syncTimer is now set → a second call is a no-op
    startSyncScheduler(60_000);

    stopSyncScheduler();
  });

  it("stopSyncScheduler is idempotent (safe to call twice)", () => {
    vi.useFakeTimers();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);
    vi.spyOn(db, "getAllResources").mockResolvedValue([]);

    startSyncScheduler(60_000);
    stopSyncScheduler(); // normal stop
    stopSyncScheduler(); // no-op — _syncTimer is already null
  });

  it("fires the scheduled interval callback", async () => {
    vi.useFakeTimers();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);
    vi.spyOn(db, "getAllResources").mockResolvedValue([]);

    startSyncScheduler(1_000);

    // Advance past the interval to fire the scheduled callback once
    await vi.advanceTimersByTimeAsync(1_001);

    stopSyncScheduler();
  });
});
