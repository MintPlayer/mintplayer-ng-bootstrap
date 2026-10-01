/**
 * The web-component codegen: the script that produces the `.styles.ts` and
 * `.element.template.ts` files every other suite's inputs are built from. A
 * silent regression here corrupts generated code across the workspace, so the
 * traversal, the predicates and — above all — `runOnce`'s changed/skipped
 * accounting (the idempotence the Nx cache and a clean `git status` both rest
 * on) are pinned here.
 *
 * The module is side-effect-free on import: argv validation and the CLI sit
 * behind an isEntryPoint guard and every path constant is a defaulted
 * parameter, so these cases drive it against an mkdtemp tree and never touch
 * the workspace.
 *
 * Deliberately NOT covered: `startWatchers` (chokidar + a 150 ms debounce with
 * `inFlight`/`dirty` re-entrancy — worth testing, but only with an injected
 * fake watcher and fake timers, which is its own piece of work).
 */
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findFiles,
  isElementHtml,
  isStylesScss,
  main,
  parseArgs,
  processElement,
  processLightStyles,
  processStyles,
  runOnce,
  startWatchers,
  toPosix,
  walk,
} from './build-web-components.mjs';

// realpathSync: on Windows mkdtemp hands back a short/junction path, and
// runOnce reports paths derived from the root it was given — comparing an
// underived fixture against a derived result would fail there and only there.
const roots: string[] = [];
function makeTree(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'mp-wc-codegen-')));
  roots.push(root);
  return root;
}

/** Written at runtime with explicit \n so no fixture file is subject to autocrlf. */
function write(path: string, contents: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents.replace(/\r?\n/g, '\n'), 'utf8');
  return path;
}

async function collect(dir: string): Promise<string[]> {
  const found: string[] = [];
  for await (const file of walk(dir)) found.push(file);
  return found.sort();
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

// ===========================================================================
// parseArgs
// ===========================================================================

describe('parseArgs', () => {
  it('reports watch mode off and every positional as a libRoot', () => {
    expect(parseArgs(['libs/a', 'libs/b'])).toEqual({
      watchMode: false,
      libRoots: ['libs/a', 'libs/b'],
    });
  });

  it('lifts --watch out of the positionals', () => {
    expect(parseArgs(['--watch', 'libs/a'])).toEqual({ watchMode: true, libRoots: ['libs/a'] });
  });

  it('accepts --watch after the libRoots', () => {
    expect(parseArgs(['libs/a', '--watch'])).toEqual({ watchMode: true, libRoots: ['libs/a'] });
  });

  it('reports no libRoots for empty argv — the usage error main() exits on', () => {
    expect(parseArgs([])).toEqual({ watchMode: false, libRoots: [] });
  });

  it('reports no libRoots when --watch is the only argument', () => {
    expect(parseArgs(['--watch'])).toEqual({ watchMode: true, libRoots: [] });
  });
});

// ===========================================================================
// Predicates and posix normalisation
// ===========================================================================

describe('isElementHtml', () => {
  it.each([
    ['an element template', 'mp-foo.element.html', true],
    ['a plain html file', 'index.html', false],
    ['the sibling scss', 'mp-foo.element.scss', false],
    ['the generated output', 'mp-foo.element.template.ts', false],
  ])('is %s -> %s', (_label, file, expected) => {
    expect(isElementHtml(file)).toBe(expected);
  });
});

describe('isStylesScss', () => {
  it.each([
    ['a styles source', 'mp-foo.styles.scss', true],
    ['a plain scss partial', '_mixins.scss', false],
    ['an element scss', 'mp-foo.element.scss', false],
    ['the generated output', 'mp-foo.styles.ts', false],
  ])('is %s -> %s', (_label, file, expected) => {
    expect(isStylesScss(file)).toBe(expected);
  });
});

describe('toPosix', () => {
  // The generated header must read identically on every OS, so the assertion
  // is always the posix literal — never a native-separator expectation.
  it('normalises a native path to posix', () => {
    expect(toPosix(join('a', 'b', 'c.scss'))).toBe('a/b/c.scss');
  });

  it('leaves an already-posix path alone', () => {
    expect(toPosix('a/b/c.scss')).toBe('a/b/c.scss');
  });

  it('replaces every backslash, not just the first', () => {
    expect(toPosix('a\\b\\c')).toBe('a/b/c');
  });
});

// ===========================================================================
// walk
// ===========================================================================

describe('walk', () => {
  it('yields files from nested directories', async () => {
    const root = makeTree();
    write(join(root, 'a.scss'), 'a');
    write(join(root, 'deep', 'nested', 'b.scss'), 'b');

    expect(await collect(root)).toEqual(
      [join(root, 'a.scss'), join(root, 'deep', 'nested', 'b.scss')].sort(),
    );
  });

  it('skips node_modules and dot-prefixed entries', async () => {
    const root = makeTree();
    write(join(root, 'keep.scss'), 'k');
    write(join(root, 'node_modules', 'pkg', 'skip.scss'), 's');
    write(join(root, '.angular', 'cache', 'skip.scss'), 's');
    write(join(root, '.hidden.scss'), 's');

    expect(await collect(root)).toEqual([join(root, 'keep.scss')]);
  });

  // The ENOENT swallow: a libRoot that does not exist is "no inputs", not a
  // crash — codegen runs before some of the trees it is pointed at exist.
  it('yields nothing for a directory that does not exist', async () => {
    const root = makeTree();
    expect(await collect(join(root, 'absent'))).toEqual([]);
  });

  it('rethrows a readdir failure that is not ENOENT', async () => {
    const root = makeTree();
    const notADirectory = write(join(root, 'file.txt'), 'x');
    await expect(collect(notADirectory)).rejects.toMatchObject({ code: 'ENOTDIR' });
  });
});

// ===========================================================================
// findFiles
// ===========================================================================

describe('findFiles', () => {
  it('resolves a relative libRoot against the repo root and filters by predicate', async () => {
    const root = makeTree();
    write(join(root, 'libs', 'wc', 'mp-a.styles.scss'), 'a');
    write(join(root, 'libs', 'wc', 'mp-a.element.html'), '<b></b>');

    expect(await findFiles('libs/wc', isStylesScss, root)).toEqual([
      join(root, 'libs', 'wc', 'mp-a.styles.scss'),
    ]);
  });

  it('accepts an absolute libRoot', async () => {
    const root = makeTree();
    const scss = write(join(root, 'mp-a.styles.scss'), 'a');
    expect(await findFiles(root, isStylesScss, root)).toEqual([scss]);
  });

  it('returns nothing for a libRoot that does not exist', async () => {
    const root = makeTree();
    expect(await findFiles('libs/absent', isStylesScss, root)).toEqual([]);
  });
});

// ===========================================================================
// processElement / processStyles
// ===========================================================================

describe('processElement', () => {
  it('fails with a workspace-relative message when the sibling scss is missing', async () => {
    const root = makeTree();
    const html = write(join(root, 'libs', 'wc', 'mp-a.element.html'), '<b></b>');

    await expect(processElement(html, root)).rejects.toThrow(
      /missing sibling mp-a\.element\.scss$/,
    );
  });

  it('writes a template module the first time and skips it the second', async () => {
    const root = makeTree();
    const html = write(join(root, 'wc', 'mp-a.element.html'), '<b class="x">hi</b>');
    write(join(root, 'wc', 'mp-a.element.scss'), '.x { color: red; }');

    const first = await processElement(html, root);
    expect(first.outPath).toBe(join(root, 'wc', 'mp-a.element.template.ts'));
    expect(first.changed).toBe(true);

    const generated = readFileSync(first.outPath, 'utf8');
    expect(generated).toContain('export const template');
    expect(generated).toContain('export const styles');
    expect(generated).toContain('hi');
    expect(generated).toContain('color: red');
    // Source header: posix even where the tree was walked with backslashes.
    expect(generated).toContain('mp-a.element.html + mp-a.element.scss');

    expect((await processElement(html, root)).changed).toBe(false);
  });
});

describe('processStyles', () => {
  it('writes a styles module named after the camel-cased basename', async () => {
    const root = makeTree();
    const scss = write(join(root, 'wc', 'mp-my-thing.styles.scss'), ':host { display: block; }');

    const first = await processStyles(scss, root);
    expect(first.outPath).toBe(join(root, 'wc', 'mp-my-thing.styles.ts'));
    expect(first.changed).toBe(true);

    const generated = readFileSync(first.outPath, 'utf8');
    expect(generated).toContain('export const mpMyThingStyles');
    expect(generated).toContain('display: block');
    expect(generated).toContain('mp-my-thing.styles.scss');

    expect((await processStyles(scss, root)).changed).toBe(false);
  });
});

// ===========================================================================
// runOnce — the changed/skipped accounting the Nx cache depends on
// ===========================================================================

describe('runOnce', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    return () => log.mockRestore();
  });

  const logged = () => log.mock.calls.map((c: unknown[]) => String(c[0]));

  it('reports nothing to do when no libRoot holds an input', async () => {
    const root = makeTree();
    mkdirSync(join(root, 'libs', 'empty'), { recursive: true });

    expect(await runOnce(['libs/empty', 'libs/absent'], root)).toEqual({
      total: 0,
      changedCount: 0,
    });
    expect(logged()).toContain('build-web-components: no inputs found, nothing to do.');
  });

  it('counts every input as written on a cold tree and as skipped on a rerun', async () => {
    const root = makeTree();
    write(join(root, 'libs', 'wc', 'a', 'mp-a.element.html'), '<b></b>');
    write(join(root, 'libs', 'wc', 'a', 'mp-a.element.scss'), 'b { color: red; }');
    write(join(root, 'libs', 'wc', 'b', 'mp-b.styles.scss'), ':host { display: block; }');
    write(join(root, 'libs', 'wc', 'c', 'mp-c.styles.scss'), ':host { display: flex; }');

    expect(await runOnce(['libs/wc'], root)).toEqual({ total: 3, changedCount: 3 });
    expect(logged().at(-1)).toBe('build-web-components: 3 input(s) processed, 3 written.');
    // Reported paths are repo-relative and posix on every OS.
    expect(logged()).toContain('wrote    libs/wc/a/mp-a.element.template.ts');
    expect(logged()).toContain('wrote    libs/wc/b/mp-b.styles.ts');

    log.mockClear();
    expect(await runOnce(['libs/wc'], root)).toEqual({ total: 3, changedCount: 0 });
    expect(logged().at(-1)).toBe('build-web-components: 3 input(s) processed, 0 written.');
    expect(logged()).toContain('skipped  libs/wc/c/mp-c.styles.ts');
  });

  it('counts only the input whose source changed', async () => {
    const root = makeTree();
    write(join(root, 'wc', 'mp-a.styles.scss'), ':host { display: block; }');
    write(join(root, 'wc', 'mp-b.styles.scss'), ':host { display: flex; }');

    await runOnce(['wc'], root);
    write(join(root, 'wc', 'mp-b.styles.scss'), ':host { display: grid; }');

    expect(await runOnce(['wc'], root)).toEqual({ total: 2, changedCount: 1 });
  });

  it('collects inputs from every libRoot it is given', async () => {
    const root = makeTree();
    write(join(root, 'one', 'mp-a.styles.scss'), ':host { display: block; }');
    write(join(root, 'two', 'mp-b.styles.scss'), ':host { display: flex; }');

    expect(await runOnce(['one', 'two'], root)).toEqual({ total: 2, changedCount: 2 });
  });

  it('propagates a missing sibling scss rather than reporting a clean run', async () => {
    const root = makeTree();
    write(join(root, 'wc', 'mp-a.element.html'), '<b></b>');

    await expect(runOnce(['wc'], root)).rejects.toThrow(/missing sibling/);
  });
});

// ===========================================================================
// processLightStyles: the light-tier pattern (rescoped, no shadow root)
// ===========================================================================

describe('processLightStyles', () => {
  it('rescopes the compiled CSS to the file\'s scope, dropping an mp- prefix', async () => {
    const root = makeTree();
    const scss = write(join(root, 'wc', 'mp-tree-thing.light.scss'), ':host { display: block; } .row { color: red; }');

    const { outPath, changed } = await processLightStyles(scss, root);

    expect(outPath).toBe(join(root, 'wc', 'mp-tree-thing.light.styles.ts'));
    expect(changed).toBe(true);
    const out = readFileSync(outPath, 'utf8');
    expect(out).toContain('export const treeThingLightStyles');
    // :host becomes the tag; every other compound carries the scope attribute.
    expect(out).toContain('.row[data-mps=tree-thing]');
    expect(out).not.toContain(':host');
  });

  it('skips the write when the rescoped output is unchanged', async () => {
    const root = makeTree();
    const scss = write(join(root, 'wc', 'plain.light.scss'), '.a { color: red; }');
    await processLightStyles(scss, root);
    expect((await processLightStyles(scss, root)).changed).toBe(false);
  });
});

describe('runOnce — light-tier inputs', () => {
  it('processes .light.scss alongside the other two patterns', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const root = makeTree();
      write(join(root, 'wc', 'mp-a.styles.scss'), ':host { display: block; }');
      write(join(root, 'wc', 'mp-b.light.scss'), '.b { color: red; }');

      expect(await runOnce(['wc'], root)).toEqual({ total: 2, changedCount: 2 });
      expect(log.mock.calls.map(([l]) => l)).toContain('wrote    wc/mp-b.light.styles.ts');

      log.mockClear();
      await runOnce(['wc'], root);
      expect(log.mock.calls.map(([l]) => l)).toContain('skipped  wc/mp-b.light.styles.ts');
    } finally {
      log.mockRestore();
    }
  });
});

// ===========================================================================
// startWatchers: debounce and in-flight coalescing, driven with fake timers
// ===========================================================================

describe('startWatchers', () => {
  /** A stand-in for chokidar: records its arguments and lets the spec fire events. */
  function fakeWatch() {
    const handlers: ((event: string, path: string) => void)[] = [];
    const watch = vi.fn((_paths: string[], _options: object) => ({
      on: (_name: string, handler: (event: string, path: string) => void) => {
        handlers.push(handler);
      },
    }));
    const fire = (path: string) => handlers.map((h) => h('change', path));
    return { watch, fire };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    return () => {
      vi.useRealTimers();
      log.mockRestore();
    };
  });

  const root = resolve('/repo');

  it('watches each libRoot resolved against the repo root, ignoring node_modules and dot dirs', () => {
    const { watch } = fakeWatch();
    startWatchers(['libs/a', 'libs/b'], root, { watch, run: vi.fn() });

    const [paths, options] = watch.mock.calls[0];
    expect(paths).toEqual([resolve(root, 'libs/a'), resolve(root, 'libs/b')]);
    expect(options).toMatchObject({ ignoreInitial: true, persistent: true });
    const ignored = (options as { ignored: RegExp }).ignored;
    expect(ignored.test('/repo/libs/a/node_modules/x.scss')).toBe(true);
    expect(ignored.test('/repo/libs/a/.cache/x.scss')).toBe(true);
    expect(ignored.test('/repo/libs/a/src/x.scss')).toBe(false);
  });

  it('coalesces a burst of changes into one run, 150ms after the last', async () => {
    const { watch, fire } = fakeWatch();
    const run = vi.fn(async () => undefined);
    startWatchers(['libs/a'], root, { watch, run });

    fire('/repo/libs/a/x.styles.scss');
    await vi.advanceTimersByTimeAsync(100);
    fire('/repo/libs/a/y.element.html');
    await vi.advanceTimersByTimeAsync(100);
    expect(run).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(['libs/a'], root);
  });

  it('ignores changes to files codegen does not read', async () => {
    const { watch, fire } = fakeWatch();
    const run = vi.fn(async () => undefined);
    startWatchers(['libs/a'], root, { watch, run });

    fire('/repo/libs/a/x.ts');
    fire('/repo/libs/a/README.md');
    fire('');
    await vi.advanceTimersByTimeAsync(500);
    expect(run).not.toHaveBeenCalled();
  });

  it('reruns once more when a change lands while a run is in flight, never concurrently', async () => {
    const { watch, fire } = fakeWatch();
    let release!: () => void;
    let concurrent = 0;
    let maxConcurrent = 0;
    const run = vi.fn(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise<void>((r) => (release = r));
      concurrent--;
    });
    startWatchers(['libs/a'], root, { watch, run });

    fire('/repo/libs/a/x.scss');
    await vi.advanceTimersByTimeAsync(150);
    expect(run).toHaveBeenCalledTimes(1);

    // Two changes during the run: the second flush finds the first in flight.
    fire('/repo/libs/a/x.scss');
    await vi.advanceTimersByTimeAsync(150);
    expect(run).toHaveBeenCalledTimes(1);

    release();
    await vi.advanceTimersByTimeAsync(150);
    expect(run).toHaveBeenCalledTimes(2);
    release();
    await vi.advanceTimersByTimeAsync(500);
    expect(run).toHaveBeenCalledTimes(2);
    expect(maxConcurrent).toBe(1);
  });

  it('keeps watching after a failed run, logging the error instead of crashing the sidecar', async () => {
    const { watch, fire } = fakeWatch();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const run = vi.fn(async () => {
        throw new Error('bad scss');
      });
      startWatchers(['libs/a'], root, { watch, run });

      fire('/repo/libs/a/x.scss');
      await vi.advanceTimersByTimeAsync(150);
      expect(error.mock.calls[0][0]).toMatch(/bad scss/);

      fire('/repo/libs/a/x.scss');
      await vi.advanceTimersByTimeAsync(150);
      expect(run).toHaveBeenCalledTimes(2);
    } finally {
      error.mockRestore();
    }
  });
});

// ===========================================================================
// main: the CLI
// ===========================================================================

describe('main', () => {
  beforeEach(() => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    return () => log.mockRestore();
  });

  it('exits 1 with a usage error when no libRoot is given', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(await main([], makeTree())).toBe(1);
      expect(error).toHaveBeenCalledWith('build-web-components: at least one <libRoot> argument is required');
    } finally {
      error.mockRestore();
    }
  });

  it('runs codegen once and exits 0 without starting a watcher', async () => {
    const root = makeTree();
    write(join(root, 'wc', 'mp-a.styles.scss'), ':host { display: block; }');
    const watch = vi.fn();

    expect(await main(['wc'], root, { watch })).toBe(0);
    expect(readFileSync(join(root, 'wc', 'mp-a.styles.ts'), 'utf8')).toContain('export const mpAStyles');
    expect(watch).not.toHaveBeenCalled();
  });

  it('starts watching every libRoot after the first pass under --watch', async () => {
    const root = makeTree();
    const watch = vi.fn((_paths: string[], _options: object) => ({ on: vi.fn() }));

    expect(await main(['one', '--watch', 'two'], root, { watch })).toBe(0);
    expect(watch.mock.calls[0][0]).toEqual([resolve(root, 'one'), resolve(root, 'two')]);
  });
});
