import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * No generated component sheet may contain a `[data-bs-theme` selector.
 *
 * Bootstrap's colour modes are ancestor selectors (`[data-bs-theme=dark] .x`).
 * Inside a shadow root they can never match, because the themed ancestor lives
 * outside the root; in a light-tier sheet the rescoper stamps the ancestor
 * compound (`[data-bs-theme=dark][data-mps=…]`), which no element carries. Either
 * way the rule is dead, and the dark look it was meant to deliver silently never
 * appears. Dark variants are written as `@container style(--mp-color-mode: dark)`
 * instead (docs/prd/dark-mode.md D6), which crosses the shadow boundary.
 *
 * Scanned: every generated `*.styles.ts` and `*.light.styles.ts`, plus every
 * `*.element.template.ts` whose `.element.scss` source still exists (a template
 * with no source is a stale, unimported build leftover). Comments are stripped
 * first, so prose that names the attribute does not count.
 *
 * Exemptions are listed explicitly below so one can never be added silently.
 * None are expected.
 */

// vitest runs with the lib as its root; a workspace-root invocation is also
// supported so the suite behaves the same however it is launched.
const LIB_ROOT = existsSync(join(process.cwd(), 'light-dom'))
  ? process.cwd()
  : join(process.cwd(), 'libs', 'mintplayer-web-components');

/** Generated sheets (lib-relative, forward slashes) allowed to keep the selector. An entry here is a review decision. */
const EXEMPT_SHEETS: readonly string[] = [
  // (none)
];

const isGeneratedSheet = (dir: string, name: string): boolean =>
  name.endsWith('.styles.ts') ||
  (name.endsWith('.element.template.ts') &&
    existsSync(join(dir, name.replace(/\.template\.ts$/, '.scss'))));

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return isGeneratedSheet(dir, entry.name) ? [full] : [];
    });

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

const sheets = walk(LIB_ROOT).map((abs) => ({
  file: abs.slice(LIB_ROOT.length + 1).replace(/\\/g, '/'),
  css: stripComments(readFileSync(abs, 'utf8')),
}));

const offenders = (css: string): string[] =>
  css
    .split(/[{}]/)
    .filter((chunk) => chunk.includes('[data-bs-theme'))
    .map((chunk) => chunk.trim().replace(/\s+/g, ' '));

describe('generated sheets carry no [data-bs-theme selectors', () => {
  it('finds generated sheets to check (codegen has run)', () => {
    expect(sheets.length).toBeGreaterThan(0);
  });

  it('every exemption names a sheet that exists', () => {
    const files = new Set(sheets.map((s) => s.file));
    expect(EXEMPT_SHEETS.filter((f) => !files.has(f))).toEqual([]);
  });

  it.each(sheets.filter((s) => !EXEMPT_SHEETS.includes(s.file)).map((s) => [s.file, s.css] as const))(
    '%s',
    (_file, css) => {
      expect(offenders(css)).toEqual([]);
    },
  );
});
