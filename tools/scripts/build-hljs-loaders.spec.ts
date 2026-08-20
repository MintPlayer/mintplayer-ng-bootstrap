import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `main()` builds its own `require` through `requireFrom(repoRoot)`, and a temp
 * repo root has no node_modules — so the only seam that lets the fail-loud
 * branch be reached is `createRequire` itself. `collectAliases` takes the
 * `require` as a parameter, so its own cases need no mock at all.
 *
 * Note the module header: a fake hljs cannot drive the REAL grammars (calling
 * one throws `hljs.COMMENT is not a function`). So the fakes here never call a
 * real grammar function — they stand in for both sides of the boundary at once,
 * which is exactly what the seam permits and no more.
 */
let fakeRequire: ((id: string) => unknown) | null = null;

vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  return {
    ...actual,
    createRequire: (url: string | URL) => (fakeRequire ?? actual.createRequire(url)) as never,
  };
});

import { collectAliases, hljsPaths, main, parseCommonIds } from './build-hljs-loaders.mjs';

describe('parseCommonIds', () => {
  it('extracts every grammar id lib/common registers', () => {
    const src = [
      "var xml = require('./languages/xml');",
      'var ts = require("./languages/typescript");',
      "var css = require('./languages/css');",
    ].join('\n');
    expect(parseCommonIds(src)).toEqual(['css', 'typescript', 'xml']);
  });

  it('de-duplicates a grammar required twice', () => {
    const src = "require('./languages/xml');require('./languages/xml');";
    expect(parseCommonIds(src)).toEqual(['xml']);
  });

  it('sorts, so the generated map is stable across hljs releases', () => {
    const src = "require('./languages/xml');require('./languages/bash');";
    expect(parseCommonIds(src)).toEqual(['bash', 'xml']);
  });

  it('accepts a hyphenated id', () => {
    expect(parseCommonIds("require('./languages/objectivec-x');")).toEqual(['objectivec-x']);
  });

  it('ignores requires that are not grammars', () => {
    const src = "require('./core');require('../lib/languages/xml');require('./languages/');";
    expect(parseCommonIds(src)).toEqual([]);
  });

  it('returns nothing for source with no requires at all', () => {
    expect(parseCommonIds('export default {};')).toEqual([]);
  });
});

/** A `require` over a fake hljs core plus the named grammar modules. */
const makeRequire = (grammars: Record<string, unknown>) => {
  const registered = new Map<string, { aliases?: string[] }>();
  const hljs = {
    registerLanguage: (id: string, fn: unknown) =>
      registered.set(id, typeof fn === 'function' ? (fn as () => { aliases?: string[] })() : {}),
    getLanguage: (id: string) => registered.get(id),
  };
  return (id: string) => {
    if (id === 'highlight.js/lib/core') return hljs;
    const key = id.replace('highlight.js/lib/languages/', '');
    if (!(key in grammars)) throw new Error(`Cannot find module '${id}'\n    at somewhere`);
    const mod = grammars[key];
    if (mod instanceof Error) throw mod;
    return mod;
  };
};

describe('collectAliases', () => {
  it('reads each grammar back off the registry it just registered against', () => {
    const require = makeRequire({
      typescript: { default: () => ({ aliases: ['ts', 'tsx'] }) },
      xml: { default: () => ({ aliases: ['html'] }) },
    });
    expect(collectAliases(['typescript', 'xml'], require)).toEqual({
      entries: [
        { id: 'typescript', aliases: ['ts', 'tsx'] },
        { id: 'xml', aliases: ['html'] },
      ],
      failures: [],
    });
  });

  it('yields an empty alias list for a grammar that declares none', () => {
    const require = makeRequire({ css: { default: () => ({}) } });
    expect(collectAliases(['css'], require).entries).toEqual([{ id: 'css', aliases: [] }]);
  });

  it('accepts a CommonJS grammar exported without a .default', () => {
    const require = makeRequire({ css: () => ({ aliases: ['scss'] }) });
    expect(collectAliases(['css'], require).entries).toEqual([{ id: 'css', aliases: ['scss'] }]);
  });

  it('collects a failing grammar instead of aborting the whole run', () => {
    const require = makeRequire({ css: { default: () => ({ aliases: [] }) } });
    const { entries, failures } = collectAliases(['css', 'ghost'], require);
    expect(entries).toEqual([{ id: 'css', aliases: [] }]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('ghost: ');
  });

  it('keeps only the first line of the failure, so the summary stays one line per grammar', () => {
    const require = makeRequire({ boom: new Error('exploded\n    at frame one\n    at frame two') });
    expect(collectAliases(['boom'], require).failures).toEqual(['boom: Error: exploded']);
  });

  it('returns empty results for an empty id list', () => {
    expect(collectAliases([], makeRequire({}))).toEqual({ entries: [], failures: [] });
  });
});

describe('hljsPaths', () => {
  it('derives both paths from the injected repo root', () => {
    const root = join('base', 'repo');
    expect(hljsPaths(root).outPath).toBe(
      join(root, 'libs/mintplayer-web-components/code-snippet/src/hljs-loaders.generated.ts'),
    );
    expect(hljsPaths(root).commonPath).toBe(join(root, 'node_modules/highlight.js/lib/common.js'));
  });
});

describe('main', () => {
  let root: string;

  beforeEach(async () => {
    // realpath: Windows hands back a short/junction path from mkdtemp.
    root = realpathSync(await mkdtemp(join(tmpdir(), 'hljs-loaders-')));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
  });

  afterEach(async () => {
    fakeRequire = null;
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  const seed = async (ids: string[]) => {
    const { commonPath, outPath } = hljsPaths(root);
    await mkdir(join(commonPath, '..'), { recursive: true });
    await writeFile(commonPath, ids.map((id) => `require('./languages/${id}');`).join('\n') + '\n', 'utf8');
    await mkdir(join(outPath, '..'), { recursive: true });
  };

  it('refuses to run when highlight.js is not installed', async () => {
    await expect(main(root)).rejects.toThrow('process.exit(1)');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('is highlight.js installed?'));
  });

  it('writes one loader entry per id and per alias', async () => {
    await seed(['typescript', 'xml']);
    fakeRequire = makeRequire({
      typescript: { default: () => ({ aliases: ['ts', 'tsx'] }) },
      xml: { default: () => ({ aliases: ['html'] }) },
    });

    await main(root);

    const out = await readFile(hljsPaths(root).outPath, 'utf8');
    expect(out).toContain(
      "  'tsx': () => import('highlight.js/lib/languages/typescript').then((m) => m.default),",
    );
    expect(out).toContain("  'html': 'xml',");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2 grammar(s) + 3 alias(es)'));
  });

  // A grammar that fails to register would silently vanish from the map, and
  // `<mp-code-snippet language="x">` would then fall through to hljs's
  // auto-detect at RUNTIME — wrong colours, no error, in a published package.
  // The build must stop instead, so both the exit and the per-grammar diagnostic
  // are pinned here.
  it('fails loud when a grammar cannot be registered', async () => {
    await seed(['css', 'ghost']);
    fakeRequire = makeRequire({ css: { default: () => ({ aliases: [] }) } });

    await expect(main(root)).rejects.toThrow('process.exit(1)');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('1 grammar(s) failed to register'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ghost: '));
  });

  it('writes nothing when a grammar fails to register', async () => {
    await seed(['ghost']);
    fakeRequire = makeRequire({});

    await expect(main(root)).rejects.toThrow('process.exit(1)');
    await expect(readFile(hljsPaths(root).outPath, 'utf8')).rejects.toThrow();
  });

  it('is idempotent — a second run skips the write', async () => {
    await seed(['css']);
    fakeRequire = makeRequire({ css: { default: () => ({ aliases: [] }) } });
    await main(root);
    vi.mocked(console.log).mockClear();

    await main(root);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('skipped libs/mintplayer-web-components/code-snippet/src/hljs-loaders.generated.ts'),
    );
  });
});
