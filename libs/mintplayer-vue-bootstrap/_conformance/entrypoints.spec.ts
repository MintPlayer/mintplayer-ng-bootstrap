import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { discoverEntries } from '../../../tools/vite/multi-entry.mjs';

/**
 * Every published entry point loads, and exports something (PRD P2-D2).
 *
 * The entry list comes from `discoverEntries`, the function `vite.config.mts`
 * builds the package with, so what is published is what is checked. For this lib
 * the build entry is `<entry>/src/index.ts`; each entry also has an
 * `<entry>/index.ts` barrel (what the `@mintplayer/vue-bootstrap/<entry>` path
 * alias resolves to in the workspace), and the barrel must expose exactly the
 * build entry's exports — a barrel that drifts from its entry means the demo apps
 * and the published package see two different APIs.
 *
 * The primary entry (`src/index.ts`) intentionally exports nothing (consumers
 * import sub-entries), and that is asserted too.
 */

const LIB_ROOT = resolve(import.meta.dirname, '..');

const LOADERS = Object.fromEntries(
  Object.entries(
    import.meta.glob<Record<string, unknown>>([
      '../*/index.ts',
      '../*/*/index.ts',
      '../*/src/index.ts',
      '../*/*/src/index.ts',
    ]),
  ).map(([rel, load]) => [resolve(import.meta.dirname, rel), load]),
);

const ENTRIES = Object.entries(discoverEntries(LIB_ROOT))
  .map(([name, file]) => ({ name, file: resolve(file), barrel: resolve(dirname(dirname(file)), 'index.ts') }))
  .sort((a, b) => a.name.localeCompare(b.name));

const SUB_ENTRIES = ENTRIES.filter((e) => e.name !== 'index');

describe('vue-bootstrap entry points', () => {
  it('discovers the published entry points', () => {
    expect(SUB_ENTRIES.length).toBeGreaterThanOrEqual(35);
    expect(ENTRIES.some((e) => e.name === 'index')).toBe(true);
  });

  it('has a loader for every entry point and for every sub-entry barrel', () => {
    expect(ENTRIES.filter((e) => !LOADERS[e.file]).map((e) => e.name)).toEqual([]);
    expect(SUB_ENTRIES.filter((e) => !LOADERS[e.barrel]).map((e) => e.name)).toEqual([]);
  });

  it.each(SUB_ENTRIES)('$name loads, exports at least one symbol, and its barrel matches', async ({ file, barrel }) => {
    const mod = await LOADERS[file]();
    const viaBarrel = await LOADERS[barrel]();

    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.keys(viaBarrel).sort()).toEqual(Object.keys(mod).sort());
    expect(Object.keys(mod).every((key) => viaBarrel[key] === mod[key])).toBe(true);
  });

  it('the primary entry loads and exports nothing, by design', async () => {
    const primary = ENTRIES.find((e) => e.name === 'index')!;

    expect(Object.keys(await LOADERS[primary.file]())).toEqual([]);
  });
});
