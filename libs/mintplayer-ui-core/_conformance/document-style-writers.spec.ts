import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Only the shared installer may write CSS at document level — the ui-core
 * half of the guard that `libs/mintplayer-web-components/_conformance/
 * document-style-writers.spec.ts` keeps for the elements. Issue #432 is the
 * reason it exists: a second writer put an unscoped sheet on the page and
 * nothing checked it.
 */
const LIB_ROOT = existsSync(join(process.cwd(), 'scoped-styles'))
  ? process.cwd()
  : join(process.cwd(), 'libs', 'mintplayer-ui-core');

const ALLOWED_WRITERS: readonly string[] = ['scoped-styles/src/install-scoped-styles.ts'];

const WRITER_PATTERNS: readonly RegExp[] = [
  /\bcreateElement\(\s*['"]style['"]\s*\)/,
  /\bdocument\.head\.(?:append|appendChild|prepend|insertBefore|insertAdjacentHTML|innerHTML)\b/,
  /\bdocument\.adoptedStyleSheets\s*=/,
  /\bdocument\.adoptedStyleSheets\.(?:push|unshift|splice)\(/,
  /\.insertRule\(/,
];

const isSource = (name: string): boolean =>
  name.endsWith('.ts') && !name.endsWith('.spec.ts') && !name.endsWith('.d.ts') && !name.endsWith('.styles.ts');

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

describe('document-level CSS has a single writer (ui-core)', () => {
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
