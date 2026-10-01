/**
 * Escapes text for HTML, safe in both an element's text and a quoted
 * attribute value (either quote style): `&`, `<`, `>`, `"` and `'`.
 * Everything Express writes into a page's `<head>` goes through this.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
