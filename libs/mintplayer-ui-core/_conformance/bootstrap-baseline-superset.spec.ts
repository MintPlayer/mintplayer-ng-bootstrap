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
 *
 * Since #452 the page baseline holds only the page-level partials; every
 * component partial is a part sheet under ui-core/styles/parts. Stock
 * Bootstrap must be covered by the baseline and the parts TOGETHER, and the
 * baseline itself must stay free of component CSS.
 */
import { compile, Logger } from 'sass';
import { readdirSync, readFileSync } from 'node:fs';
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
  const partsDir = join(repoRoot, 'libs/mintplayer-ui-core/styles/parts');
  const parts = Object.fromEntries(
    readdirSync(partsDir)
      .filter((name) => name.endsWith('.bootstrap.scss'))
      .map((name) => [name, classesOf(compile(join(partsDir, name), { ...options, loadPaths: [partsDir, ...options.loadPaths] }).css)]),
  );
  const shipped = new Set([...baseline, ...Object.values(parts).flatMap((classes) => [...classes])]);

  it('keeps every class stock Bootstrap ships, in the baseline or a part', () => {
    expect(Object.keys(parts).length).toBe(26);
    expect([...classesOf(stockCss)].filter((name) => !shipped.has(name))).toEqual([]);
  });

  it('ships no component partial page-wide', () => {
    expect(['card', 'card-body', 'dropdown-menu', 'form-control', 'navbar', 'modal', 'row', 'container', 'table', 'list-group', 'page-link'].filter((name) => baseline.has(name))).toEqual([]);
    expect(['btn', 'btn-primary', 'visually-hidden', 'd-none', 'img-fluid'].filter((name) => !baseline.has(name))).toEqual([]);
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

  it('ships the utility patches classes under the prefixes they always had', () => {
    expect(baseline.has('cursor-pointer')).toBe(true);
    expect(baseline.has('overflow-x-clip')).toBe(true);
    expect(baseline.has('overflow-x-auto')).toBe(true);
  });

  it('reads class selectors only (the check is not vacuous)', () => {
    expect([...classesOf('/* see example.com */ .a, .b:hover > .c { x: url(y.png) }')]).toEqual(['a', 'b', 'c']);
  });
});

/**
 * A future Bootstrap may define any key a patch uses today (cursor, say), and
 * the superset check above only notices once that release is installed. So a
 * patch never writes a literal entry under a non-`mp-` key: it adds classes
 * under a key of its own, or merges into Bootstrap's entry on purpose
 * (`"width": map.merge(map.get($utilities, "width"), ...)`).
 */
describe('utility patches', () => {
  // Read from disk: vitest's css handling serves `.scss?raw` empty, which would make every check pass.
  const dir = join(repoRoot, 'libs/mintplayer-ui-core/styles/utilities');
  const patches = Object.fromEntries(
    readdirSync(dir)
      .filter((name) => name.endsWith('.scss'))
      .map((name) => [name, readFileSync(join(dir, name), 'utf8')]),
  );
  /** The keys a patch assigns a literal map to, which replaces whatever Bootstrap has under them. */
  const literalKeys = (scss: string) => [...scss.matchAll(/"([\w-]+)"\s*:\s*\(/g)].map((m) => m[1]);

  it('finds the patches', () => {
    expect(Object.keys(patches).length).toBeGreaterThan(0);
    expect(Object.values(patches).every((scss) => scss.includes('$utilities'))).toBe(true);
  });

  it.each(Object.entries(patches))('%s never replaces a Bootstrap key', (_path, scss) => {
    expect(literalKeys(scss).filter((key) => !key.startsWith('mp-'))).toEqual([]);
  });

  it('recognises a replacing entry and allows a merge (the check is not vacuous)', () => {
    expect(literalKeys('"cursor": (property: cursor), "mp-x": (property: x)')).toEqual(['cursor', 'mp-x']);
    expect(literalKeys('"width": map.merge(map.get($utilities, "width"), (responsive: true))')).toEqual([]);
  });
});
