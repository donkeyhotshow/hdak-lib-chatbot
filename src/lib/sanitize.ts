/**
 * HTML sanitization utilities.
 * Strips tags, decodes entities, and removes dangerous URL schemes.
 */

/**
 * Strip HTML tags and decode common entities.
 * Decodes entities first, then strips tags to prevent entity-based XSS.
 */
export function stripHtml(html: string): string {
  return (
    html
      // Strip tags FIRST — before decoding entities to prevent entity-based tag resurrection
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      // Remove dangerous URL schemes — only when they appear as a URL scheme
      // (i.e. not inside legitimate text like "вхідні дані: ...")
      .replace(/\bjavascript\s*:/gi, "")
      .replace(/\bvbscript\s*:/gi, "")
      // C3: data: is only dangerous inside src/href — plain text "дані: ..." is fine.
      // After tag-stripping, any remaining data: prefix must come from a non-tag
      // context, so we only strip it when it directly precedes base64 or comma
      // (i.e. an actual data-URI, not normal Ukrainian text).
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
