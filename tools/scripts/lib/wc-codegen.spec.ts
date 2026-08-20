import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  buildElementTemplateModule,
  buildStylesModule,
  escapeForTemplateLiteral,
  toCamelCase,
  writeIfChanged,
} from './wc-codegen.mjs';

/**
 * Evaluate a generated template-literal body the way the emitted `.ts` file
 * will. This is the assertion that actually matters: an escape is correct iff
 * the JS engine reading it back produces the original string.
 */
const roundTrip = (raw: string): string =>
  new Function(`return \`${escapeForTemplateLiteral(raw)}\`;`)() as string;

describe('escapeForTemplateLiteral', () => {
  it('doubles backslashes', () => {
    expect(escapeForTemplateLiteral('a\\b')).toBe('a\\\\b');
  });

  it('escapes backticks', () => {
    expect(escapeForTemplateLiteral('a`b')).toBe('a\\`b');
  });

  it('escapes template-literal interpolation openers', () => {
    expect(escapeForTemplateLiteral('a${b}')).toBe('a\\${b}');
  });

  it('leaves a lone $ alone — only ${ opens an interpolation', () => {
    expect(escapeForTemplateLiteral('cost: $5')).toBe('cost: $5');
  });

  it('leaves a string with nothing to escape byte-identical', () => {
    const plain = '.mp-card { color: red; }';
    expect(escapeForTemplateLiteral(plain)).toBe(plain);
  });

  it('handles the empty string', () => {
    expect(escapeForTemplateLiteral('')).toBe('');
  });

  // The three replaces are order-dependent: backslashes MUST double first, or
  // the escapes introduced by the later two get themselves escaped. A string
  // carrying all three at once is the case that catches a reordering — each
  // one in isolation survives either order.
  it('escapes a backslash, a backtick and an interpolation together', () => {
    expect(escapeForTemplateLiteral('\\`${')).toBe('\\\\\\`\\${');
  });

  it('is not confused by a backslash that already precedes an interpolation', () => {
    // Reversing the replace order would produce '\\\\${' here instead.
    expect(escapeForTemplateLiteral('\\${')).toBe('\\\\\\${');
  });

  describe('round-trips through the JS engine', () => {
    const cases: Record<string, string> = {
      'plain css': 'a { b: c }',
      backslash: 'content: "\\2014"',
      'trailing backslash': 'a\\',
      'double backslash': 'a\\\\b',
      backtick: 'font-family: `mono`',
      interpolation: 'width: ${x}px',
      'escaped-looking interpolation': '\\${x}',
      'all three': '\\`${',
      'css escape sequence': '.a\\:b::before { content: "\\e900"; }',
      newlines: 'a {\n  b: c;\n}\n',
      'dollar then brace on a boundary': '$ {not interpolation}',
    };

    for (const [name, raw] of Object.entries(cases)) {
      it(name, () => {
        expect(roundTrip(raw)).toBe(raw);
      });
    }
  });
});

describe('toCamelCase', () => {
  it('camel-cases a kebab name', () => {
    expect(toCamelCase('mp-code-snippet')).toBe('mpCodeSnippet');
  });

  it('treats a digit as a word start', () => {
    expect(toCamelCase('grid-2-col')).toBe('grid2Col');
  });

  it('leaves a name with no dashes alone', () => {
    expect(toCamelCase('card')).toBe('card');
  });

  it('leaves a trailing dash alone — there is nothing to capitalize', () => {
    expect(toCamelCase('card-')).toBe('card-');
  });

  it('does not touch a dash followed by an uppercase letter', () => {
    expect(toCamelCase('mp-Card')).toBe('mp-Card');
  });
});

describe('buildStylesModule', () => {
  const module = buildStylesModule({
    css: '.a { b: c }',
    sourceScssRel: 'mp-card.styles.scss',
    exportName: 'mpCardStyles',
  });

  it('marks the file as generated', () => {
    expect(module).toContain('// AUTO-GENERATED — do not edit by hand.');
    expect(module).toContain('// Source: mp-card.styles.scss');
  });

  it('emits both a named and a default export', () => {
    expect(module).toContain('export const mpCardStyles = unsafeCSS(');
    expect(module).toContain('export default mpCardStyles;');
  });

  it('ends with a newline', () => {
    expect(module.endsWith('\n')).toBe(true);
  });

  it('escapes the css it embeds', () => {
    const withBacktick = buildStylesModule({
      css: 'a { content: "`" }',
      sourceScssRel: 'x.styles.scss',
      exportName: 'xStyles',
    });
    expect(withBacktick).toContain('\\`');
  });
});

describe('buildElementTemplateModule', () => {
  const module = buildElementTemplateModule({
    css: '.a { b: c }',
    html: '<div part="root"></div>',
    sourceHtmlRel: 'mp-dock.element.html',
    sourceScssRel: 'mp-dock.element.scss',
  });

  it('names both sources in the header', () => {
    expect(module).toContain('// Source: mp-dock.element.html + mp-dock.element.scss');
  });

  it('exports a lit template and a lit stylesheet', () => {
    expect(module).toContain('export const template = html`<div part="root"></div>`;');
    expect(module).toContain('export const styles = unsafeCSS(');
  });

  // The generated module is static by construction — a `${}` in the source HTML
  // must land in the output as literal text, never as an interpolation.
  it('neutralizes an interpolation in the source html', () => {
    const module = buildElementTemplateModule({
      css: '',
      html: '<span>${danger}</span>',
      sourceHtmlRel: 'x.element.html',
      sourceScssRel: 'x.element.scss',
    });
    expect(module).toContain('html`<span>\\${danger}</span>`');
  });
});

describe('writeIfChanged', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'wc-codegen-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes a file that does not exist yet', async () => {
    const path = join(dir, 'new.ts');
    expect(await writeIfChanged(path, 'hello')).toBe(true);
    expect(await readFile(path, 'utf8')).toBe('hello');
  });

  // This is the property the Nx cache and a clean `git status` both depend on.
  it('does not rewrite byte-identical content', async () => {
    const path = join(dir, 'same.ts');
    await writeFile(path, 'hello', 'utf8');
    expect(await writeIfChanged(path, 'hello')).toBe(false);
  });

  it('rewrites changed content', async () => {
    const path = join(dir, 'changed.ts');
    await writeFile(path, 'hello', 'utf8');
    expect(await writeIfChanged(path, 'goodbye')).toBe(true);
    expect(await readFile(path, 'utf8')).toBe('goodbye');
  });

  it('treats a whitespace-only difference as a change', async () => {
    const path = join(dir, 'whitespace.ts');
    await writeFile(path, 'hello\n', 'utf8');
    expect(await writeIfChanged(path, 'hello')).toBe(true);
  });
});
