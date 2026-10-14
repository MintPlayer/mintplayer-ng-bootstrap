import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Only the shared installer may write CSS at document level.
 *
 * Issue #432: mp-card appended its own `<style>` to document.head, outside the
 * light-style registry. Nothing checked that sheet, so its unscoped
 * `.text-bg-*` rules — with invalid values — overrode Bootstrap's on the whole
 * page. Routing every document-level sheet through `installLightStyles` puts it
 * in the registry, where `light-styles-scoping.spec.ts` proves it cannot leak
 * and `adoptLightStyles` mirrors it into shadow hosts.
 *
 * This is a source-text scan of the lib (specs and generated files excluded).
 * Exemptions are listed explicitly so one can never be added silently.
 */

const LIB_ROOT = existsSync(join(process.cwd(), 'light-dom'))
  ? process.cwd()
  : join(process.cwd(), 'libs', 'mintplayer-web-components');

/** Lib-relative files allowed to write document-level CSS. An entry here is a review decision. */
const ALLOWED_WRITERS: readonly string[] = [
  // The registry itself.
  'light-dom/src/install-light-styles.ts',
];

const WRITER_PATTERNS: readonly RegExp[] = [
  /\bcreateElement\(\s*['"]style['"]\s*\)/,
  /\bdocument\.head\.(?:append|appendChild|prepend|insertBefore|insertAdjacentHTML|innerHTML)\b/,
  /\bdocument\.adoptedStyleSheets\s*=/,
  /\.insertRule\(/,
];

const isSource = (name: string): boolean =>
  name.endsWith('.ts') &&
  !name.endsWith('.spec.ts') &&
  !name.endsWith('.d.ts') &&
  !name.endsWith('.styles.ts') &&
  !name.endsWith('.template.ts') &&
  !name.endsWith('.generated.ts');

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return isSource(entry.name) ? [full] : [];
    });

const sources = walk(LIB_ROOT).map((abs) => ({
  file: abs.slice(LIB_ROOT.length + 1).replace(/\\/g, '/'),
  code: readFileSync(abs, 'utf8'),
}));

describe('document-level CSS has a single writer', () => {
  it('finds source files to check', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it('every allowed writer exists', () => {
    const files = new Set(sources.map((s) => s.file));
    expect(ALLOWED_WRITERS.filter((f) => !files.has(f))).toEqual([]);
  });

  it('no other source file writes CSS to the document — use installLightStyles', () => {
    const offenders = sources
      .filter((s) => !ALLOWED_WRITERS.includes(s.file))
      .flatMap((s) => WRITER_PATTERNS.filter((p) => p.test(s.code)).map((p) => `${s.file}: ${p.source}`));
    expect(offenders).toEqual([]);
  });
});
