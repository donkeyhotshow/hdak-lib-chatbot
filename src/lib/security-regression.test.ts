import { describe, expect, it, vi, afterEach } from "vitest";
import React from "react";
import ReactMarkdown from "react-markdown";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { sanitizeHtml, sanitizeUrl, sanitizeText } from "@/lib/sanitize";
import {
  ChatMessageSchema,
  CatalogSearchSchema,
  DspaceSyncSchema,
} from "@/lib/validation";
import { isForbiddenOrigin } from "@/lib/cors";

describe("security regression coverage", () => {
  it("removes executable HTML and unsafe URLs from rendered content", () => {
    const html = sanitizeHtml(
      '<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)">click</a>'
    );

    expect(html).not.toContain("script");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("Hello");
  });

  it("does not render raw HTML in Markdown content", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ReactMarkdown,
        { skipHtml: true },
        '<img src=x onerror="alert(1)"><script>alert(1)</script>'
      )
    );

    expect(markup).not.toMatch(/<img|<script|onerror/i);
  });

  it("neutralizes XSS payload variants and preserves safe markup", () => {
    const sanitized = sanitizeHtml(
      '<ul><li>Safe</li></ul><img src="x" onerror="alert(1)"><div onclick="alert(1)">text</div><svg><script>alert(1)</script></svg><iframe src="https://evil.example"></iframe><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a><img src="data:text/html,<script>alert(1)</script>"><b><i>nested</i></b>'
    );

    expect(sanitized).toContain("<ul>");
    expect(sanitized).toContain("Safe");
    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).not.toMatch(
      /script|onerror|onclick|javascript:|<svg|<iframe|data:/i
    );
  });

  it("allows only safe URL schemes", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    expect(sanitizeUrl("/catalog/item")).toBe("/catalog/item");
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("escapes text before it is inserted into HTML contexts", () => {
    expect(sanitizeText("<img src=x onerror=alert(1)>")).toBe(
      "&lt;img src=x onerror=alert(1)&gt;"
    );
  });

  it("rejects oversized or empty chat messages", () => {
    expect(ChatMessageSchema.safeParse({ message: "" }).success).toBe(false);
    expect(
      ChatMessageSchema.safeParse({ message: "x".repeat(2001) }).success
    ).toBe(false);
    expect(ChatMessageSchema.safeParse({ message: " Hello " }).success).toBe(
      true
    );
  });

  it("bounds catalog search input and pagination", () => {
    expect(CatalogSearchSchema.safeParse({ query: "a" }).success).toBe(false);
    expect(
      CatalogSearchSchema.safeParse({
        query: "history",
        page: 1,
        limit: 100,
      }).success
    ).toBe(true);
    expect(
      CatalogSearchSchema.safeParse({ query: "history", limit: 101 }).success
    ).toBe(false);
  });

  it("validates DSpace sync modes and rejects unexpected properties", () => {
    expect(DspaceSyncSchema.parse({})).toEqual({ mode: "mock" });
    expect(DspaceSyncSchema.safeParse({ mode: "rest" }).success).toBe(true);
    expect(DspaceSyncSchema.safeParse({ mode: "shell" }).success).toBe(false);
    expect(
      DspaceSyncSchema.safeParse({ mode: "mock", extra: true }).success
    ).toBe(false);
  });
});

describe("production origin protection", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows same-origin requests but rejects a different port", () => {
    vi.stubEnv("NODE_ENV", "production");

    const sameOrigin = new NextRequest("https://library.example/api/chat", {
      method: "POST",
      headers: { origin: "https://library.example" },
    });
    const differentPort = new NextRequest("https://library.example/api/chat", {
      method: "POST",
      headers: { origin: "https://library.example:8443" },
    });

    expect(isForbiddenOrigin(sameOrigin)).toBe(false);
    expect(isForbiddenOrigin(differentPort)).toBe(true);
  });

  it("rejects cross-origin and origin-less state-changing requests", () => {
    vi.stubEnv("NODE_ENV", "production");

    const crossOrigin = new NextRequest("https://library.example/api/chat", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    });
    const noOrigin = new NextRequest("https://library.example/api/chat", {
      method: "POST",
    });

    expect(isForbiddenOrigin(crossOrigin)).toBe(true);
    expect(isForbiddenOrigin(noOrigin)).toBe(true);
  });
});
