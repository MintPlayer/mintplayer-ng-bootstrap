import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * No generated sheet, and no built module, may carry a CSS value Sass failed
 * to resolve.
 *
 * Issue #432: the card's global sheet wrote Bootstrap's upper-case
 * `RGBA($value, var(--bs-bg-opacity, 1))`. Sass leaves upper-case `RGBA`
 * alone, so it printed `RGBA(#ffc107, var(--bs-bg-opacity, 1))` — a hex colour
 * inside a legacy colour function, which is not CSS. Because the value holds a
 * `var()`, the browser cannot reject it at parse time; it is invalid at
 * computed-value time instead and `background-color` falls back to
 * `transparent`. Being `!important` and late in the cascade, it beat
 * Bootstrap's own rule for every `.text-bg-*` on the page.
 *
 * Scanned:
 *  - every generated `*.styles.ts` / `*.light.styles.ts`, plus every
 *    `*.element.template.ts` whose `.element.scss` source still exists — for a
 *    hex colour inside `rgb()`/`rgba()`/`hsl()`/`hsla()`, and for leftover Sass
 *    (`#{` interpolation, `$variable`). Comments are stripped first.
 *  - every built `dist/libs/mintplayer-web-components/**\/*.mjs` — for a hex
 *    colour inside a colour function (Sass syntax checks would false-positive
 *    on JavaScript), and every built `*.css` for all of the sheet checks. This
 *    is what consumers actually install.
 *
 * `light-dark(#…, #…)` is valid CSS and is not matched.
 */

// vitest runs with the lib as its root; a workspace-root invocation is also
// supported so the suite behaves the same however it is launched.
const LIB_ROOT = existsSync(join(process.cwd(), 'light-dom'))
  ? process.cwd()
  : join(process.cwd(), 'libs', 'mintplayer-web-components');
const DIST_ROOT = join(LIB_ROOT, '..', '..', 'dist', 'libs', 'mintplayer-web-components');

const HEX_IN_COLOR_FUNCTION = /\b(?:rgba?|hsla?)\(\s*#[0-9a-f]{3,8}\b[^)]*\)?/gi;
const SASS_INTERPOLATION = /#\{[^}]*\}?/g;
const SASS_VARIABLE = /\$(?!\{)[a-z_][\w-]*/gi;

const isGeneratedSheet = (dir: string, name: string): boolean =>
  name.endsWith('.styles.ts') ||
  (name.endsWith('.element.template.ts') &&
    existsSync(join(dir, name.replace(/\.template\.ts$/, '.scss'))));

const walk = (dir: string, keep: (dir: string, name: string) => boolean): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return walk(full, keep);
      return keep(dir, entry.name) ? [full] : [];
    });

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

const relative = (root: string, abs: string): string => abs.slice(root.length + 1).replace(/\\/g, '/');

const sheets = walk(LIB_ROOT, isGeneratedSheet).map((abs) => ({
  file: relative(LIB_ROOT, abs),
  css: stripComments(readFileSync(abs, 'utf8')),
}));

const built = (extension: string) =>
  existsSync(DIST_ROOT)
    ? walk(DIST_ROOT, (_dir, name) => name.endsWith(extension)).map((abs) => ({
        file: relative(DIST_ROOT, abs),
        code: readFileSync(abs, 'utf8'),
      }))
    : [];

const modules = built('.mjs');
// Shipped stylesheets (theming/color-mode.css, …) are plain CSS, so they get
// the full sheet checks.
const builtSheets = built('.css').map((m) => ({ file: m.file, css: stripComments(m.code) }));

const matches = (text: string, pattern: RegExp): string[] => [...text.matchAll(pattern)].map((m) => m[0]);

const sheetFindings = (css: string) => ({
  hexInColorFunction: matches(css, HEX_IN_COLOR_FUNCTION),
  sassInterpolation: matches(css, SASS_INTERPOLATION),
  sassVariable: matches(css, SASS_VARIABLE),
});
const NO_FINDINGS = { hexInColorFunction: [], sassInterpolation: [], sassVariable: [] };

describe('no unresolved or invalid CSS values', () => {
  it('finds generated sheets to check (codegen has run)', () => {
    expect(sheets.length).toBeGreaterThan(0);
  });

  it('finds built modules to check (the lib has been built)', () => {
    expect(modules.length).toBeGreaterThan(0);
  });

  describe('generated sheets', () => {
    it.each(sheets.map((s) => [s.file, s.css] as const))('%s', (_file, css) => {
      expect(sheetFindings(css)).toEqual(NO_FINDINGS);
    });
  });

  // Guarded: it.each over an empty table throws, and a package with no CSS
  // file is fine.
  if (builtSheets.length > 0) {
    describe('built stylesheets', () => {
      it.each(builtSheets.map((s) => [s.file, s.css] as const))('%s', (_file, css) => {
        expect(sheetFindings(css)).toEqual(NO_FINDINGS);
      });
    });
  }

  describe('built modules', () => {
    it.each(modules.map((m) => [m.file, m.code] as const))('%s', (_file, code) => {
      expect(matches(code, HEX_IN_COLOR_FUNCTION)).toEqual([]);
    });
  });
});
