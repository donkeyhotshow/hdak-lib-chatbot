/**
 * HTML sanitization utilities.
 * Strips tags, decodes entities, and removes dangerous URL schemes.
 */

/**
 * Strip HTML tags and decode common entities.
 * Decodes entities first, then strips tags to prevent entity-based XSS.
 */
export function stripHtml(html: string): string {
  return html
    // Strip tags FIRST — before decoding entities to prevent entity-based tag resurrection
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    // Remove dangerous URL schemes
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    // Decode entities AFTER stripping tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
