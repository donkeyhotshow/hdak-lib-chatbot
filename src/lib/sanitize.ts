import DOMPurify from "isomorphic-dompurify";
import { logger } from "./logger";

/**
 * Configuration for DOMPurify to prevent XSS attacks
 * while allowing safe markdown rendering
 */
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "a",
    "img",
  ],
  ALLOWED_ATTR: [
    "href",
    "title",
    "target",
    "rel",
    "src",
    "alt",
    "width",
    "height",
  ],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

/**
 * Sanitize HTML to prevent XSS attacks
 * Used when rendering markdown content from untrusted sources
 */
export function sanitizeHtml(html: string): string {
  try {
    if (!html || typeof html !== "string") {
      return "";
    }

    const cleaned = DOMPurify.sanitize(html, PURIFY_CONFIG);
    return cleaned;
  } catch (error) {
    logger.error("Error sanitizing HTML", error as Error);
    return ""; // Return empty string on error for safety
  }
}

/**
 * Strip HTML tags and decode common entities.
 * Legacy function kept for backward compatibility
 */
export function stripHtml(html: string): string {
  return (
    html
      // Strip tags FIRST — before decoding entities to prevent entity-based tag resurrection
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      // Remove dangerous URL schemes — only when they appear as a URL scheme
      .replace(/\bjavascript\s*:/gi, "")
      .replace(/\bvbscript\s*:/gi, "")
      .replace(/\bdata\s*:[a-z][^,\s]{0,50},/gi, "")
      // Decode entities AFTER stripping tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Sanitize text to prevent injection attacks
 * Escapes HTML special characters
 */
export function sanitizeText(text: string): string {
  try {
    if (!text || typeof text !== "string") {
      return "";
    }

    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return text.replace(/[&<>"']/g, (char) => map[char]);
  } catch (error) {
    logger.error("Error sanitizing text", error as Error);
    return text;
  }
}

/**
 * Validate and sanitize URL to prevent javascript: and data: attacks
 */
export function sanitizeUrl(url: string): string {
  try {
    if (!url || typeof url !== "string") {
      return "";
    }

    const cleaned = url.trim().toLowerCase();

    // Block dangerous protocols
    if (
      cleaned.startsWith("javascript:") ||
      cleaned.startsWith("data:") ||
      cleaned.startsWith("vbscript:") ||
      cleaned.startsWith("file:")
    ) {
      logger.warn("Blocked dangerous URL protocol", new Error(`URL: ${url}`));
      return "";
    }

    // Only allow http, https, mailto, and relative URLs
    if (
      !cleaned.startsWith("http://") &&
      !cleaned.startsWith("https://") &&
      !cleaned.startsWith("mailto:") &&
      !cleaned.startsWith("/") &&
      !cleaned.startsWith(".")
    ) {
      return "";
    }

    return url;
  } catch (error) {
    logger.error("Error sanitizing URL", error as Error);
    return "";
  }
}
