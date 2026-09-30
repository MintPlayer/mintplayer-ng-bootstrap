import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { discoverEntries } from '../../../tools/vite/multi-entry.mjs';

/**
 * Every published entry point loads, and exports something (PRD P2-D2).
 *
 * The list of entry points is not written down here: it comes from
 * `discoverEntries`, the same function `vite.config.mts` builds the package
 * with, so an entry point that is published is an entry point that is checked.
 * Each one is then imported through its `<entry>/index.ts` barrel — the build
 * entry for this lib (`requireBarrel: true`) — and must evaluate without throwing
 * and expose at least one runtime export. A barrel that re-exports a path that no
 * longer exists, a sub-entry whose module throws at import time (a top-level DOM
 * access that is not SSR-guarded, a `customElements.define` of a tag some other
 * entry already took), or a barrel that silently re-exports nothing all fail here
 * rather than in a consumer's build.
 *
 * The primary entry (`src/index.ts`) is the exception: it intentionally exports
 * nothing, and that is asserted too, so it cannot quietly start re-exporting
 * every sub-entry and defeat per-component tree-shaking.
 */

const LIB_ROOT = resolve(import.meta.dirname, '..');

/*
 * Lazy loaders for every barrel at either depth (`<entry>/index.ts` and the
 * namespaced `<ns>/<entry>/index.ts`), plus the primary entry. Keys are paths
 * relative to this file, so they are resolved to absolute paths for the lookup.
 */
const LOADERS = Object.fromEntries(
  Object.entries(
    import.meta.glob<Record<string, unknown>>(['../*/index.ts', '../*/*/index.ts', '../src/index.ts']),
  ).map(([rel, load]) => [resolve(import.meta.dirname, rel), load]),
);

const ENTRIES = Object.entries(discoverEntries(LIB_ROOT, { requireBarrel: true }))
  .map(([name, file]) => ({ name, file: resolve(file) }))
  .sort((a, b) => a.name.localeCompare(b.name));

const SUB_ENTRIES = ENTRIES.filter((e) => e.name !== 'index');

/** A module namespace's runtime export names (type-only exports are erased). */
const runtimeExports = (mod: Record<string, unknown>) => Object.keys(mod);

describe('web-components entry points', () => {
  it('discovers the published entry points', () => {
    // Guards discovery itself: a layout change that finds nothing must fail
    // loudly, not pass every check below vacuously.
    expect(SUB_ENTRIES.length).toBeGreaterThanOrEqual(40);
    expect(ENTRIES.some((e) => e.name === 'index')).toBe(true);
  });

  it('has a loader for every discovered entry point', () => {
    expect(ENTRIES.filter((e) => !LOADERS[e.file]).map((e) => e.name)).toEqual([]);
  });

  it.each(SUB_ENTRIES)('$name loads and exports at least one symbol', async ({ file }) => {
    const mod = await LOADERS[file]();

    expect(runtimeExports(mod).length).toBeGreaterThan(0);
  });

  it('the primary entry loads and exports nothing, by design', async () => {
    const primary = ENTRIES.find((e) => e.name === 'index')!;
    const mod = await LOADERS[primary.file]();

    expect(runtimeExports(mod)).toEqual([]);
  });
});
