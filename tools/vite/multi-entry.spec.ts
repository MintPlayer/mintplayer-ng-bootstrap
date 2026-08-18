import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { discoverEntries, generateSubpathExports } from './multi-entry.mts';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'multi-entry-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Create `<root>/<...segments>` and write an empty file at the last segment. */
const touch = (...segments: string[]) => {
  const path = join(root, ...segments);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, '');
};

const dir = (...segments: string[]) => mkdirSync(join(root, ...segments), { recursive: true });

describe('discoverEntries', () => {
  it('picks up the primary src/index.ts as "index"', () => {
    touch('src', 'index.ts');
    expect(discoverEntries(root)).toEqual({ index: join(root, 'src/index.ts') });
  });

  it('omits "index" entirely when there is no primary entry', () => {
    dir('calendar');
    expect(discoverEntries(root)).toEqual({});
  });

  it('treats a dir with src/index.ts as an entrypoint when no barrel is required', () => {
    touch('calendar', 'src', 'index.ts');
    expect(discoverEntries(root)).toEqual({
      'calendar/index': join(root, 'calendar/src/index.ts'),
    });
  });

  it('uses the barrel, not src/index.ts, as the entry when a barrel is required', () => {
    touch('calendar', 'src', 'index.ts');
    touch('calendar', 'index.ts');
    expect(discoverEntries(root, { requireBarrel: true })).toEqual({
      'calendar/index': join(root, 'calendar/index.ts'),
    });
  });

  // The barrel is what makes the emitted `<entry>/index.mjs` and
  // `<entry>/index.d.ts` land at the same path, so a missing one must not
  // silently publish a subpath that resolves to the wrong file.
  it('does not treat a barrel-less dir as an entrypoint under requireBarrel', () => {
    touch('calendar', 'src', 'index.ts');
    expect(discoverEntries(root, { requireBarrel: true })).toEqual({});
  });

  // The charts/ case — a root dir that is not itself an entrypoint is scanned
  // one level deeper. This recursion was a bugfix; without it every namespaced
  // component is missing from both `lib.entry` and the subpath exports.
  it('discovers namespaced entries one level deep', () => {
    touch('charts', 'hierarchy', 'src', 'index.ts');
    touch('charts', 'sparkline', 'src', 'index.ts');
    expect(discoverEntries(root)).toEqual({
      'charts/hierarchy/index': join(root, 'charts/hierarchy/src/index.ts'),
      'charts/sparkline/index': join(root, 'charts/sparkline/src/index.ts'),
    });
  });

  it('discovers namespaced entries under requireBarrel too', () => {
    touch('charts', 'hierarchy', 'src', 'index.ts');
    touch('charts', 'hierarchy', 'index.ts');
    expect(discoverEntries(root, { requireBarrel: true })).toEqual({
      'charts/hierarchy/index': join(root, 'charts/hierarchy/index.ts'),
    });
  });

  it('stops at one level — it does not recurse into a namespace of namespaces', () => {
    touch('a', 'b', 'c', 'src', 'index.ts');
    expect(discoverEntries(root)).toEqual({});
  });

  it('prefers a direct entry over scanning the dir as a namespace', () => {
    touch('charts', 'src', 'index.ts');
    touch('charts', 'hierarchy', 'src', 'index.ts');
    expect(discoverEntries(root)).toEqual({
      'charts/index': join(root, 'charts/src/index.ts'),
    });
  });

  describe('skips', () => {
    it.each([
      ['a leading underscore (_conformance)', '_conformance'],
      ['a leading dot', '.cache'],
      ['node_modules', 'node_modules'],
      ['dist', 'dist'],
    ])('%s', (_label, name) => {
      touch(name, 'src', 'index.ts');
      expect(discoverEntries(root)).toEqual({});
    });

    it('a file at the root', () => {
      touch('README.md');
      expect(discoverEntries(root)).toEqual({});
    });

    it('a skipped name nested inside a namespace dir', () => {
      touch('charts', '_scratch', 'src', 'index.ts');
      expect(discoverEntries(root)).toEqual({});
    });
  });
});

describe('generateSubpathExports', () => {
  let outDir: string;

  const run = (entries: Record<string, string>) => {
    const plugin = generateSubpathExports(outDir, root, entries);
    (plugin.closeBundle as () => void).call(plugin);
    return JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf-8'));
  };

  beforeEach(() => {
    outDir = mkdtempSync(join(tmpdir(), 'multi-entry-out-'));
    writeFileSync(join(outDir, 'package.json'), JSON.stringify({ name: '@mintplayer/x' }));
  });

  afterEach(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it('maps the primary entry to "."', () => {
    const pkg = run({ index: join(root, 'src/index.ts') });
    expect(pkg.exports['.']).toEqual({
      types: './src/index.d.ts',
      import: './index.mjs',
    });
  });

  it('strips the trailing /index from a subpath', () => {
    const pkg = run({ 'calendar/index': join(root, 'calendar/index.ts') });
    expect(pkg.exports['./calendar']).toEqual({
      types: './calendar/index.d.ts',
      import: './calendar/index.mjs',
    });
  });

  it('keeps the namespace in a nested subpath', () => {
    const pkg = run({ 'charts/hierarchy/index': join(root, 'charts/hierarchy/src/index.ts') });
    expect(pkg.exports['./charts/hierarchy']).toEqual({
      types: './charts/hierarchy/src/index.d.ts',
      import: './charts/hierarchy/index.mjs',
    });
  });

  // Emitted into package.json, which is read by bundlers on every platform —
  // a Windows separator here is a subpath nothing can resolve.
  it('emits posix separators regardless of host platform', () => {
    const pkg = run({ 'charts/hierarchy/index': join(root, 'charts/hierarchy/src/index.ts') });
    expect(JSON.stringify(pkg.exports)).not.toContain('\\\\');
  });

  it('preserves exports the package already declared', () => {
    writeFileSync(
      join(outDir, 'package.json'),
      JSON.stringify({ name: '@mintplayer/x', exports: { './styles.css': './styles.css' } }),
    );
    const pkg = run({ index: join(root, 'src/index.ts') });
    expect(pkg.exports['./styles.css']).toBe('./styles.css');
    expect(pkg.exports['.']).toBeDefined();
  });

  it('leaves the rest of package.json intact', () => {
    const pkg = run({ index: join(root, 'src/index.ts') });
    expect(pkg.name).toBe('@mintplayer/x');
  });

  // nxViteTsPaths copies package.json into dist during writeBundle; if that has
  // not happened the plugin must be a no-op rather than create a stub package.
  it('does nothing when dist has no package.json yet', () => {
    rmSync(join(outDir, 'package.json'));
    const plugin = generateSubpathExports(outDir, root, { index: join(root, 'src/index.ts') });
    expect(() => (plugin.closeBundle as () => void).call(plugin)).not.toThrow();
  });
});
