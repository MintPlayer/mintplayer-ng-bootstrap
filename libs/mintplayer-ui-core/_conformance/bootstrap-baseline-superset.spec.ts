// @vitest-environment node
/**
 * Issue #450: the baseline (`styles/bootstrap.scss`) is a SUPERSET of stock
 * Bootstrap. A utility patch `map.merge()`s a key into `$utilities`, and a key
 * Bootstrap already defines is REPLACED whole, values and class prefix alike:
 * `"width": (values: auto, responsive: true)` dropped `.w-25`..`.w-100`, and
 * `"white-space"` without `class: text` dropped `.text-wrap` / `.text-nowrap`.
 *
 * Until #437 the Angular stack ran the utility API twice (once through
 * bootstrap-utilities.scss before the patches), so the first pass hid the
 * loss for three years. This spec compiles both sheets and compares their
 * class selectors, so a patch can only ever ADD classes.
 */
import { compile, Logger } from 'sass';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const options = { loadPaths: [join(repoRoot, 'node_modules')], logger: Logger.silent, quietDeps: true };

/** Every class name a stylesheet's selectors mention. */
function classesOf(css: string): Set<string> {
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+(?=\{)/g) ?? [];
  return new Set(selectors.flatMap((selector) => [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1])));
}

describe('Bootstrap baseline', () => {
  const stockCss = compile(join(repoRoot, 'node_modules/bootstrap/scss/bootstrap.scss'), options).css;
  const baselineCss = compile(join(repoRoot, 'libs/mintplayer-ui-core/styles/bootstrap.scss'), options).css;
  const baseline = classesOf(baselineCss);

  it('keeps every class stock Bootstrap ships', () => {
    expect([...classesOf(stockCss)].filter((name) => !baseline.has(name))).toEqual([]);
  });

  it('keeps the width utilities and adds the responsive w-*-auto', () => {
    expect(baselineCss).toMatch(/\.w-100\s*\{\s*width:\s*100%\s*!important/);
    expect(baselineCss).toMatch(/\.w-25\s*\{\s*width:\s*25%\s*!important/);
    expect(baseline.has('w-md-auto')).toBe(true);
  });

  it('keeps text-wrap / text-nowrap next to the white-space-* additions', () => {
    expect(baselineCss).toMatch(/\.text-nowrap\s*\{\s*white-space:\s*nowrap\s*!important/);
    expect(baselineCss).toMatch(/\.text-wrap\s*\{\s*white-space:\s*normal\s*!important/);
    expect(baseline.has('white-space-pre-wrap')).toBe(true);
  });

  it('reads class selectors only (the check is not vacuous)', () => {
    expect([...classesOf('/* see example.com */ .a, .b:hover > .c { x: url(y.png) }')]).toEqual(['a', 'b', 'c']);
  });
});
