import { describe, it, expect, vi, afterEach } from "vitest";
import { parseResourcesFromHtml, stopSyncScheduler, CATALOG_URL } from "./syncService";

afterEach(() => {
  stopSyncScheduler();
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
    expect(results[0].url).toBe("https://library-service.com.ua:8443/khkhdak/DocumentSearchForm");
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
    expect(CATALOG_URL).toBe("https://library-service.com.ua:8443/khkhdak/DocumentSearchForm");
  });
});
