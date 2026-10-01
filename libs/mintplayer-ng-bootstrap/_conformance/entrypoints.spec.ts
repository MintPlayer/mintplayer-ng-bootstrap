/// <reference types="vite/client" />
import { dirname, resolve } from 'node:path';

/**
 * Every published entry point loads, and exports something (PRD P2-D2).
 *
 * ng-packagr publishes one secondary entry point per directory holding an
 * `ng-package.json` (`<entry>/` and the namespaced `charts/<entry>/`), each with
 * `"entryFile": "index.ts"`, plus the primary entry at `src/index.ts`. The list
 * below is derived from those `ng-package.json` files — the same marker the
 * build uses — so an entry point that ships is an entry point that is checked,
 * and one without a loadable barrel fails here instead of in ng-packagr.
 *
 * Importing a barrel evaluates the whole entry point: every component,
 * directive and service module it re-exports, and every barrel in between.
 * Each must load without throwing and expose at least one runtime export — a
 * barrel that re-exports only types (or nothing) is an entry point a consumer
 * cannot use.
 */

const LIB_ROOT = resolve(import.meta.dirname, '..');

/**
 * Entry points that publish only types (`has-id` is the `HasId<T>` interface).
 * TypeScript erases them, so at runtime they are legitimately empty; they are
 * listed explicitly rather than exempted by a looser check.
 */
const TYPE_ONLY = ['has-id'];

/* Only the keys are used: the globs are lazy, so no package file is loaded. */
const PACKAGE_DIRS = Object.keys(import.meta.glob(['../ng-package.json', '../*/ng-package.json', '../*/*/ng-package.json']))
  .map((rel) => dirname(resolve(import.meta.dirname, rel)));

const LOADERS = Object.fromEntries(
  Object.entries(
    import.meta.glob<Record<string, unknown>>(['../*/index.ts', '../*/*/index.ts']),
  ).map(([rel, load]) => [resolve(import.meta.dirname, rel), load]),
);

const ENTRIES = PACKAGE_DIRS
  .map((dir) => ({
    name: dir === LIB_ROOT ? '(primary)' : dir.slice(LIB_ROOT.length + 1).replace(/\\/g, '/'),
    file: dir === LIB_ROOT ? resolve(LIB_ROOT, 'src/index.ts') : resolve(dir, 'index.ts'),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

describe('ng-bootstrap entry points', () => {
  it('discovers the published entry points', () => {
    // Guards the glob: a layout change that finds nothing must fail loudly,
    // not pass every check below vacuously.
    expect(ENTRIES.length).toBeGreaterThanOrEqual(90);
    expect(ENTRIES.some((e) => e.name === '(primary)')).toBe(true);
  });

  it('has a loadable barrel for every entry point', () => {
    expect(ENTRIES.filter((e) => !LOADERS[e.file]).map((e) => e.name)).toEqual([]);
  });

  it.each(ENTRIES.filter((e) => !TYPE_ONLY.includes(e.name)))(
    '$name loads and exports at least one symbol',
    async ({ file }) => {
      const mod = await LOADERS[file]();

      expect(Object.keys(mod).length).toBeGreaterThan(0);
    },
  );

  it.each(TYPE_ONLY)('%s is a type-only entry point: it loads and has no runtime export', async (name) => {
    const entry = ENTRIES.find((e) => e.name === name);

    expect(entry, `${name} is no longer an entry point; drop it from TYPE_ONLY`).toBeDefined();
    // If this starts exporting a value, it has joined the ordinary entries above.
    expect(Object.keys(await LOADERS[entry!.file]())).toEqual([]);
  });
});
