import { describe, expect, it } from 'vitest';
import hljs from 'highlight.js/lib/common';
import { normalizeSource, splitHighlightedLines } from './split-lines';

/**
 * The splitter's contract is structural, so the assertions are structural:
 * one row per source line, every row independently balanced, and the text
 * round-tripping exactly. Hand-written fixtures pin the edge cases; real
 * highlight.js output guards against the grammar emitting a shape the
 * scanner does not expect.
 */

const stripTags = (html: string) => html.replace(/<[^>]*>/g, '');

const unescape = (html: string) =>
  html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

/** True when every `<span>` opened in the row is also closed in that row. */
const isBalanced = (row: string) => {
  let depth = 0;
  for (const match of row.matchAll(/<(\/?)span\b[^>]*>/g)) {
    depth += match[1] ? -1 : 1;
    if (depth < 0) return false;
  }
  return depth === 0;
};

const textOf = (rows: string[]) => rows.map((r) => unescape(stripTags(r))).join('\n');

describe('normalizeSource', () => {
  it('collapses CRLF and lone CR to LF', () => {
    expect(normalizeSource('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('drops a single trailing newline so there is no phantom final row', () => {
    expect(normalizeSource('a\nb\n')).toBe('a\nb');
    expect(normalizeSource('a\r\nb\r\n')).toBe('a\nb');
  });

  it('keeps a deliberate trailing blank line (two newlines means one blank row)', () => {
    expect(normalizeSource('a\nb\n\n')).toBe('a\nb\n');
  });

  it('leaves already-normal source untouched', () => {
    expect(normalizeSource('a\nb')).toBe('a\nb');
  });
});

describe('splitHighlightedLines', () => {
  it('returns a single row for source with no newline', () => {
    expect(splitHighlightedLines('<span class="hljs-keyword">const</span> a')).toEqual([
      '<span class="hljs-keyword">const</span> a',
    ]);
  });

  it('re-opens a span that crosses a newline, closing it on each row', () => {
    const rows = splitHighlightedLines('<span class="c">one\ntwo</span>');
    expect(rows).toEqual(['<span class="c">one</span>', '<span class="c">two</span>']);
    expect(rows.every(isBalanced)).toBe(true);
  });

  it('re-opens nested spans in the right order', () => {
    const rows = splitHighlightedLines('<span class="a">x<span class="b">y\nz</span></span>');
    expect(rows).toEqual([
      '<span class="a">x<span class="b">y</span></span>',
      '<span class="a"><span class="b">z</span></span>',
    ]);
  });

  it('preserves empty lines as empty rows', () => {
    const rows = splitHighlightedLines('a\n\n\nb');
    expect(rows).toEqual(['a', '', '', 'b']);
  });

  it('does not treat an escaped entity as markup', () => {
    const rows = splitHighlightedLines('a &amp; b &lt;c&gt;');
    expect(rows).toEqual(['a &amp; b &lt;c&gt;']);
  });

  it('emits a trailing empty row when the input genuinely ends in a newline', () => {
    // normalizeSource is what prevents this in the element; the splitter
    // itself must stay faithful to its input.
    expect(splitHighlightedLines('a\n')).toEqual(['a', '']);
  });

  it('does not loop or throw on truncated markup', () => {
    expect(splitHighlightedLines('a <span class="x')).toEqual(['a <span class="x']);
  });

  it('leaves a void-style self-closing tag off the open stack', () => {
    const rows = splitHighlightedLines('<br/>a\nb');
    expect(rows).toEqual(['<br/>a', 'b']);
  });
});

describe('splitHighlightedLines over real highlight.js output', () => {
  const samples: Record<string, string> = {
    typescript: `interface Foo {\n  /* a comment\n     spanning lines */\n  bar: string;\n}\n\nconst x: Foo = { bar: 'hi <b>' };`,
    json: `{\n  "answer": 42,\n  "nested": { "a": [1, 2] }\n}`,
    xml: `<div class="a">\n  <span>x &amp; y</span>\n</div>`,
    csharp: `public class A {\n  // comment\n  public string B { get; set; }\n}`,
    markdown: '# Title\n\n```ts\nconst a = 1;\n```\n\ntext',
  };

  for (const [language, source] of Object.entries(samples)) {
    it(`round-trips ${language}: one balanced row per line, text preserved`, () => {
      const highlighted = hljs.highlight(source, { language, ignoreIllegals: true }).value;
      const rows = splitHighlightedLines(highlighted);

      expect(rows).toHaveLength(source.split('\n').length);
      expect(rows.every(isBalanced)).toBe(true);
      expect(textOf(rows)).toBe(source);
    });
  }

  it('keeps a 4-line block comment highlighted on every one of its rows', () => {
    const highlighted = hljs.highlight('/* one\ntwo\nthree\nfour */\nafter', {
      language: 'typescript',
    }).value;
    const rows = splitHighlightedLines(highlighted);

    expect(rows).toHaveLength(5);
    expect(rows.every(isBalanced)).toBe(true);
    expect(rows.slice(0, 4).every((r) => r.includes('hljs-comment'))).toBe(true);
    expect(rows[4]).not.toContain('hljs-comment');
  });

  it('escapes an ampersand exactly once', () => {
    const highlighted = hljs.highlight('const s = "a & b < c";', { language: 'typescript' }).value;
    const [row] = splitHighlightedLines(highlighted);

    expect(row).toContain('&amp;');
    expect(row).not.toContain('&amp;amp;');
  });
});
