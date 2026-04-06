import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchCatalogDirect } from "./catalogSearch";

// Mock the global fetch used by the service
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Helper: build a minimal HTML catalog response with the given book rows
function makeHtml(rows: { title: string; author: string; year: string; href: string }[]) {
  const header = "<tr><th>Назва</th><th>Автор</th><th>Рік</th></tr>";
  const body = rows
    .map(
      r =>
        `<tr><td><a href="${r.href}">${r.title}</a></td><td>${r.author}</td><td>${r.year}</td></tr>`
    )
    .join("\n");
  return `<html><body><table>${header}${body}</table></body></html>`;
}

describe("searchCatalogDirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok:true with parsed books on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        makeHtml([
          { title: "Кобзар", author: "Шевченко Т.", year: "2020", href: "/doc/1" },
          { title: "Лісова пісня", author: "Леся Українка", year: "2019", href: "/doc/2" },
        ]),
    });

    const result = await searchCatalogDirect({ title: "Кобзар" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected");
    expect(result.results).toHaveLength(2);
    expect(result.results[0].title).toBe("Кобзар");
    expect(result.results[0].author).toBe("Шевченко Т.");
    expect(result.results[0].url).toContain("/doc/1");
  });

  it("filters rows that have an empty title", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        makeHtml([
          { title: "", author: "Анонім", year: "2021", href: "/doc/3" },
          { title: "Реальна книга", author: "Автор", year: "2022", href: "/doc/4" },
        ]),
    });

    const result = await searchCatalogDirect({ author: "Автор" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected");
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe("Реальна книга");
  });

  it("caps results at 8 entries", async () => {
    const manyRows = Array.from({ length: 15 }, (_, i) => ({
      title: `Book ${i}`,
      author: "Author",
      year: "2020",
      href: `/doc/${i}`,
    }));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => makeHtml(manyRows),
    });

    const result = await searchCatalogDirect({ topic: "anything" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected");
    expect(result.results.length).toBeLessThanOrEqual(8);
  });

  it("retries once and returns ok:false with error_type:unavailable on two failures", async () => {
    // Both attempts fail with a network error
    mockFetch
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await searchCatalogDirect({ title: "Шевченко" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unexpected");
    expect(result.error_type).toBe("unavailable");
    expect(result.fallback).toBeDefined();
    expect(result.fallback.length).toBeGreaterThan(0);
  });

  it("succeeds on the second attempt when the first fails", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          makeHtml([{ title: "Відновлена книга", author: "Автор", year: "2023", href: "/doc/5" }]),
      });

    const result = await searchCatalogDirect({ title: "Відновлена книга" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected");
    expect(result.results[0].title).toBe("Відновлена книга");
  });

  it("returns ok:false with error_type:unavailable on HTTP error status", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 });

    const result = await searchCatalogDirect({ author: "Unknown" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unexpected");
    expect(result.error_type).toBe("unavailable");
  });

  it("includes author/title/topic in the constructed search URL", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "<html><table></table></html>" });

    const result = await searchCatalogDirect({ author: "Франко", title: "Захар Berkut", topic: "поезія" });

    // URLSearchParams encodes Cyrillic as percent-sequences and spaces as '+'
    const url = new URL(result.search_url);
    expect(url.searchParams.get("author")).toBe("Франко");
    expect(url.searchParams.get("title")).toBe("Захар Berkut");
    expect(url.searchParams.get("subject")).toBe("поезія");
  });
});
