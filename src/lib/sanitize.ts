/**
 * Strips all HTML tags from a string.
 * Replaces sanitize-html for our use case (always { allowedTags: [] }).
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
