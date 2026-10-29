import { describe, expect, it } from 'vitest';
import { CODE_SNIPPET_LABELS, codeSnippetRowCount, connectCodeSnippet, plainLines, tabbableLine, type CodeSnippetOptions } from './code-snippet';

const options = (patch: Partial<CodeSnippetOptions> = {}): CodeSnippetOptions => ({
  id: 'cs',
  code: 'const a = 1;\nconst b = "<x>";\n',
  theme: 'auto',
  wrap: false,
  lineNumbers: false,
  startLine: 1,
  annotations: [],
  activeLine: null,
  lineHref: null,
  label: '',
  labels: CODE_SNIPPET_LABELS,
  language: 'code',
  highlighted: null,
  rovingLine: null,
  copied: false,
  hydrated: true,
  ...patch,
});

describe('connectCodeSnippet', () => {
  it('renders escaped plain rows until highlighted, one per line without a phantom last row', () => {
    const view = connectCodeSnippet(options());
    expect(view.rows.map((r) => r.html)).toEqual(['const a = 1;', 'const b = &quot;&lt;x&gt;&quot;;']);
    expect(view.rows.every((r) => r.row['data-mps'] === undefined)).toBe(true);
  });

  it('uses the highlighted rows when given', () => {
    const view = connectCodeSnippet(options({ highlighted: ['<span class="hljs-keyword">const</span>', 'b'] }));
    expect(view.rows[0].html).toBe('<span class="hljs-keyword">const</span>');
  });

  it('disables the copy button until hydrated, and names it from the language', () => {
    expect(connectCodeSnippet(options({ hydrated: false })).copy['disabled']).toBe(true);
    const view = connectCodeSnippet(options({ language: 'typescript' }));
    expect(view.copy['disabled']).toBe(false);
    expect(view.copy['aria-label']).toBe('Copy typescript code to clipboard');
    expect(view.copyText).toBe('Copy typescript');
  });

  it('names the region from label, else from the pattern', () => {
    expect(connectCodeSnippet(options({ language: 'ts' })).pre['aria-label']).toBe('ts code sample');
    expect(connectCodeSnippet(options({ label: 'Mine' })).pre['aria-label']).toBe('Mine');
  });

  it('hides inert line numbers, and links them with a roving tab stop when lineHref is set', () => {
    const inert = connectCodeSnippet(options({ lineNumbers: true }));
    expect(inert.rows[0].gutter).toMatchObject({ 'aria-hidden': 'true' });
    expect(inert.rows[0].link).toBeNull();
    expect(inert.keymap).toBeNull();

    const linked = connectCodeSnippet(options({ lineNumbers: true, lineHref: (n) => `/f#L${n}`, activeLine: 2 }));
    expect(linked.rows.map((r) => r.link?.['tabindex'])).toEqual([-1, 0]);
    expect(linked.rows[1].link).toMatchObject({ 'aria-label': 'Line 2', 'data-line': 2 });
    expect(linked.rows[1].href).toBe('/f#L2');
    expect(linked.pre['aria-describedby']).toBe('cs-keymap');
    expect(linked.keymap?.['id']).toBe('cs-keymap');
  });

  it('keeps a bare fragment on the server and resolves it against the current URL after hydration', () => {
    const href = (n: number) => `#L${n}`;
    expect(connectCodeSnippet(options({ lineNumbers: true, lineHref: href, hydrated: false })).rows[0].href).toBe('#L1');
    expect(connectCodeSnippet(options({ lineNumbers: true, lineHref: href })).rows[0].href).toBe(`${location.pathname}${location.search}#L1`);
  });

  it('renders annotations as row classes, marks and a description, including past the source', () => {
    const view = connectCodeSnippet(
      options({
        startLine: 10,
        activeLine: 10,
        annotations: [
          { line: 10, kind: 'partial', label: '4×', secondaryLabel: '1/2', description: 'Branches: 1 of 2' },
          { line: 13, kind: 'uncovered', label: '0' },
        ],
      }),
    );
    expect(view.rows.map((r) => r.number)).toEqual([10, 11, 12, 13]);
    expect(view.rows[0].row).toMatchObject({ id: 'cs-L10', class: 'line active annotated annotation-partial', title: 'Branches: 1 of 2' });
    expect([view.rows[0].markText, view.rows[0].secondaryText, view.rows[0].descriptionText]).toEqual(['4×', '1/2', 'Branches: 1 of 2']);
    expect(view.rows[3].markText).toBe('0');
    expect(view.rows[3].secondary).toBeNull();
    expect(view.rows[3].html).toBe('');
  });

  it('writes theme and wrap on the root, and announces a copy', () => {
    const view = connectCodeSnippet(options({ theme: 'dark', wrap: true, copied: true }));
    expect(view.root).toMatchObject({ class: 'code-snippet', 'data-theme': 'dark', 'data-wrap': '' });
    expect(view.toast['class']).toBe('toast visible');
    expect(view.liveText).toBe('Copied to clipboard');
    expect(connectCodeSnippet(options()).root['data-theme']).toBeNull();
  });
});

describe('helpers', () => {
  it('plainLines normalises CRLF and the trailing newline', () => {
    expect(plainLines('a\r\nb\r\n')).toEqual(['a', 'b']);
    expect(plainLines('')).toEqual([]);
  });

  it('codeSnippetRowCount honours annotations past the end', () => {
    expect(codeSnippetRowCount(2, [], 1)).toBe(2);
    expect(codeSnippetRowCount(2, [{ line: 15 }], 10)).toBe(6);
  });

  it('tabbableLine prefers the roving line, then the active line, then the first', () => {
    expect(tabbableLine(5, 3, 1)).toBe(5);
    expect(tabbableLine(null, 3, 1)).toBe(3);
    expect(tabbableLine(null, null, 7)).toBe(7);
  });
});
