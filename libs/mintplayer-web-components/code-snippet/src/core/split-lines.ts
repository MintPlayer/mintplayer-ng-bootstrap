/**
 * Turning highlight.js output into per-line rows.
 *
 * highlight.js emits ONE HTML string for the whole source, and its token
 * elements freely cross newlines — a block comment opened on line 1 and closed
 * on line 4 is a single `<span>` containing three `\n`s. A per-line renderer
 * cannot use that directly: every row needs to be its own element so it can
 * carry an id, a gutter and an annotation background, and slicing the string
 * at each `\n` would leave rows with unbalanced tags.
 *
 * So each row is closed at the newline and every still-open element is
 * re-opened on the next row.
 */

/**
 * Normalize source before it is highlighted and split.
 *
 * Line numbers must agree with what the consumer counted, so this runs once,
 * here, rather than being every caller's responsibility: CRLF would otherwise
 * leave a stray `\r` at the end of every row, and a trailing newline would
 * produce a phantom final row that no editor shows.
 */
export function normalizeSource(source: string): string {
  return source.replace(/\r\n?/g, '\n').replace(/\n$/, '');
}

/**
 * Escape source for rendering as-is.
 *
 * The element paints escaped plain text before the grammar has loaded (and if
 * it never loads), and that text goes through the same `unsafeHTML` path as
 * highlighted output — so it has to be escaped here rather than trusted.
 */
export function escapeHtml(source: string): string {
  return source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Split highlight.js output into one well-formed HTML fragment per source
 * line. Concatenating the rows' text content reproduces the input text
 * exactly; every row is independently balanced.
 *
 * Scanning is safe on hljs output specifically — it emits only
 * `<span class="…">` elements and HTML-escaped text, so a literal `\n` can
 * never appear inside a tag or inside an entity, and a literal `<` is always
 * the start of a tag. That is why this is a scanner and not an HTML parser:
 * a parser would be strictly more machinery for the same result on this input.
 *
 * Do not feed it arbitrary HTML.
 */
export function splitHighlightedLines(html: string): string[] {
  const rows: string[] = [];
  // Open tags, outermost first — the prefix to re-open on the next row.
  const open: string[] = [];
  let current = '';
  let i = 0;

  while (i < html.length) {
    const char = html[i];

    if (char === '<') {
      const close = html.indexOf('>', i);
      if (close === -1) {
        // Truncated markup: emit the remainder verbatim rather than looping.
        current += html.slice(i);
        break;
      }
      const tag = html.slice(i, close + 1);
      if (tag[1] === '/') open.pop();
      else if (html[close - 1] !== '/') open.push(tag);
      current += tag;
      i = close + 1;
    } else if (char === '\n') {
      rows.push(current + '</span>'.repeat(open.length));
      current = open.join('');
      i++;
    } else {
      current += char;
      i++;
    }
  }

  rows.push(current + '</span>'.repeat(open.length));
  return rows;
}
