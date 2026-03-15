import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseResourcesFromHtml,
  stopSyncScheduler,
  runSync,
  isSyncing,
  CATALOG_URL,
} from "./syncService";
import type { LibraryResource } from "../../../drizzle/schema";
import * as db from "../db";

afterEach(() => {
  stopSyncScheduler();
  vi.restoreAllMocks();
});

describe("syncService — parseResourcesFromHtml", () => {
  it("returns an empty array for HTML with no relevant links", () => {
    const html = `<html><body><p>Hello world</p></body></html>`;
    expect(parseResourcesFromHtml(html)).toEqual([]);
  });

  it("detects a catalog link", () => {
    const html = `<a href="https://library-service.com.ua:8443/khkhdak/DocumentSearchForm">Електронний каталог</a>`;
    const results = parseResourcesFromHtml(html);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("catalog");
    expect(results[0].url).toBe(
      "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm"
    );
    expect(results[0].nameUk).toBe("Електронний каталог");
  });

  it("detects a repository link", () => {
    const html = `<a href="https://repository.ac.kharkov.ua/home">Репозитарій ХДАК</a>`;
    const results = parseResourcesFromHtml(html);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("repository");
  });

  it("detects a database link (Scopus)", () => {
    const html = `<a href="https://www.scopus.com/">Scopus</a>`;
    const results = parseResourcesFromHtml(html);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("database");
    expect(results[0].nameUk).toBe("Scopus");
  });

  it("detects an electronic library link", () => {
    const html = `<a href="http://elib.nplu.org/">Електронна бібліотека</a>`;
    const results = parseResourcesFromHtml(html);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("electronic_library");
  });

  it("ignores relative links", () => {
    const html = `<a href="/page.html">Internal page</a>`;
    expect(parseResourcesFromHtml(html)).toEqual([]);
  });

  it("ignores links with empty text", () => {
    const html = `<a href="https://repository.ac.kharkov.ua/home">   </a>`;
    expect(parseResourcesFromHtml(html)).toEqual([]);
  });

  it("parses multiple resources from a page", () => {
    const html = `
      <a href="https://library-service.com.ua:8443/khkhdak/DocumentSearchForm">Каталог</a>
      <a href="https://repository.ac.kharkov.ua/home">Репозитарій</a>
      <a href="https://www.scopus.com/">Scopus</a>
    `;
    const results = parseResourcesFromHtml(html);
    expect(results).toHaveLength(3);
    const types = results.map(r => r.type);
    expect(types).toContain("catalog");
    expect(types).toContain("repository");
    expect(types).toContain("database");
  });

  it("normalises whitespace in link text", () => {
    const html = `<a href="https://www.scopus.com/">  Scopus   Base </a>`;
    const results = parseResourcesFromHtml(html);
    // Leading/trailing whitespace is stripped; internal runs are collapsed to a single space
    expect(results[0].nameUk).toBe("Scopus Base");
  });
});

describe("syncService — CATALOG_URL", () => {
  it("points to the HDAK catalog search form", () => {
    expect(CATALOG_URL).toBe(
      "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm"
    );
  });
});

describe("syncService — concurrency guard", () => {
  it("isSyncing() returns false when no sync is running", () => {
    expect(isSyncing()).toBe(false);
  });

  it("returns early with 'Sync already in progress' when called concurrently", async () => {
    // Use a deferred promise so we can resolve it for clean test teardown
    let resolveFetch!: (value: Response) => void;
    const blockingFetch = new Promise<Response>(resolve => {
      resolveFetch = resolve;
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValueOnce(blockingFetch);

    // Start first sync (will block on the mocked fetch)
    const firstSync = runSync();

    // Give the event loop a tick so the first sync sets _isSyncing = true
    await new Promise(resolve => setImmediate(resolve));

    // Second sync should immediately return without running
    const secondResult = await runSync();
    expect(secondResult).toEqual({
      synced: 0,
      errors: ["Sync already in progress"],
    });

    // Clean up: resolve the blocked fetch so firstSync can finish
    resolveFetch(new Response("", { status: 200 }));
    await firstSync;

    fetchSpy.mockRestore();
  });

  it("isSyncing() resets to false after stopSyncScheduler()", async () => {
    stopSyncScheduler();
    expect(isSyncing()).toBe(false);
  });
});

describe("syncService — sanity check", () => {
  it("returns an error and does not update sync status when 0 resources parsed but DB has resources", async () => {
    // Simulate the catalog page returning empty HTML (no known links)
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body><p>Under maintenance</p></body></html>", {
        status: 200,
      })
    );
    // Mock DB returning pre-existing resources
    const mockResources: Pick<
      LibraryResource,
      "id" | "nameEn" | "nameUk" | "nameRu" | "type"
    >[] = [
      {
        id: 1,
        nameEn: "Catalog",
        nameUk: "Каталог",
        nameRu: "Каталог",
        type: "catalog",
      },
      {
        id: 2,
        nameEn: "Repo",
        nameUk: "Репозитарій",
        nameRu: "Репозитарий",
        type: "repository",
      },
    ];
    vi.spyOn(db, "getAllResources").mockResolvedValueOnce(
      mockResources as LibraryResource[]
    );

    const result = await runSync();

    expect(result.synced).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Sanity check failed");
    expect(result.errors[0]).toContain("0 resources");
  });

  it("proceeds normally when 0 resources parsed and DB is also empty", async () => {
    // Empty catalog HTML AND empty DB — valid "nothing to sync" case
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body></body></html>", { status: 200 })
    );
    vi.spyOn(db, "getAllResources").mockResolvedValueOnce([]);

    const result = await runSync();

    // No error, just nothing synced
    expect(result.synced).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});

describe("syncService — _isSyncing always resets (try/finally)", () => {
  it("resets isSyncing to false even when getAllResources throws unexpectedly", async () => {
    // Simulate a successful catalog fetch returning empty HTML
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body></body></html>", { status: 200 })
    );
    // Make getAllResources throw to exercise the previously-broken code path
    vi.spyOn(db, "getAllResources").mockRejectedValueOnce(
      new Error("DB connection lost")
    );

    await expect(runSync()).rejects.toThrow("DB connection lost");

    // The flag must be reset by the finally block — without the fix it would
    // stay true forever and block all future sync attempts.
    expect(isSyncing()).toBe(false);
  });
});
