import { describe, expect, it } from "vitest";
import { sanitizeHtml, sanitizeUrl, sanitizeText } from "@/lib/sanitize";
import { ChatMessageSchema, CatalogSearchSchema } from "@/lib/validation";

describe("security regression coverage", () => {
  it("removes executable HTML and unsafe URLs from rendered content", () => {
    const html = sanitizeHtml(
      '<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)">click</a>'
    );

    expect(html).not.toContain("script");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("Hello");
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
});
