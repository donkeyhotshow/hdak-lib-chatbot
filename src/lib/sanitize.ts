import { logger } from "./logger";

/**
 * Keep the rendered markdown surface deliberately small. The markdown
 * renderer already produces a known set of tags, so an allowlist is safer
 * here than bringing a browser DOM into the server bundle.
 */
const ALLOWED_TAGS = new Set([
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
]);

const SAFE_ATTRIBUTES = new Set([
  "href",
  "title",
  "target",
  "rel",
  "src",
  "alt",
  "width",
  "height",
]);

function sanitizeTag(match: string): string {
  const tagName = match.match(/^<\s*\/?\s*([a-z0-9]+)/i)?.[1]?.toLowerCase();
  if (!tagName || !ALLOWED_TAGS.has(tagName)) return "";
  if (/^<\s*\//.test(match)) return `</${tagName}>`;
  if (tagName === "br") return "<br>";

  const attributes = [...match.matchAll(/([a-z-]+)\s*=\s*(["'])(.*?)\2/gi)]
    .filter(([, name]) => SAFE_ATTRIBUTES.has(name.toLowerCase()))
    .map(([, name, quote, value]) => {
      if (
        (name.toLowerCase() === "href" || name.toLowerCase() === "src") &&
        !sanitizeUrl(value)
      ) {
        return "";
      }
      const escaped = value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      return `${name}="${escaped}"`;
    })
    .filter(Boolean);

  return `<${tagName}${attributes.length ? ` ${attributes.join(" ")}` : ""}>`;
}

/**
 * Sanitize HTML to prevent XSS attacks
 * Used when rendering markdown content from untrusted sources
 */
export function sanitizeHtml(html: string): string {
  try {
    if (!html || typeof html !== "string") {
      return "";
    }

    return html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(
        /<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi,
        ""
      )
      .replace(/<[^>]+>/g, sanitizeTag)
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  } catch (error) {
    logger.error("Error sanitizing HTML", error as Error);
    return "";
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

    return text.replace(/[&<>"']/g, char => map[char]);
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
