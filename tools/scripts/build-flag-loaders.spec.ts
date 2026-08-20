import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { codesFromAssetNames, flagPaths, main, report } from './build-flag-loaders.mjs';

describe('codesFromAssetNames', () => {
  it('strips the extension and sorts', () => {
    expect(codesFromAssetNames(['fr.svg', 'be.svg', 'us.svg'])).toEqual(['be', 'fr', 'us']);
  });

  it('ignores everything that is not an .svg', () => {
    expect(codesFromAssetNames(['be.svg', 'README.md', 'LICENSE', 'be.svg.bak'])).toEqual(['be']);
  });

  it('returns an empty list for an empty directory', () => {
    expect(codesFromAssetNames([])).toEqual([]);
  });

  it('keeps a code containing a dot-free hyphen intact', () => {
    expect(codesFromAssetNames(['gb-eng.svg'])).toEqual(['gb-eng']);
  });
});

describe('flagPaths', () => {
  it('derives every path from the injected repo root', () => {
    const root = join('base', 'repo');
    const paths = flagPaths(root);
    expect(paths.flagsSrc).toBe(join(root, 'libs/mintplayer-web-components/flags/src'));
    expect(paths.assetsDir).toBe(join(paths.flagsSrc, 'assets'));
    expect(paths.loadersPath).toBe(join(paths.flagsSrc, 'flag-loaders.generated.ts'));
    expect(paths.bundlePath).toBe(join(paths.flagsSrc, 'all-flags.generated.ts'));
  });
});

describe('report', () => {
  const root = join('base', 'repo');

  // Built with join() so each platform exercises its own separator; only the
  // posix form of the OUTPUT is asserted, because that is the contract — the
  // summary line must read the same on Windows and Linux.
  it('posix-normalises the path relative to the repo root', () => {
    expect(report(true, join(root, 'libs', 'flags', 'x.ts'), root)).toBe('wrote   libs/flags/x.ts');
  });

  it('says skipped when nothing was written', () => {
    expect(report(false, join(root, 'libs', 'flags', 'x.ts'), root)).toBe('skipped libs/flags/x.ts');
  });

  it('pads both verdicts to the same width so a two-part summary stays aligned', () => {
    const wrote = report(true, join(root, 'a.ts'), root);
    const skipped = report(false, join(root, 'a.ts'), root);
    expect(wrote.indexOf('a.ts')).toBe(skipped.indexOf('a.ts'));
  });
});

describe('main', () => {
  let root: string;
  let assetsDir: string;

  beforeEach(async () => {
    // realpath: Windows hands back a short/junction path from mkdtemp.
    root = realpathSync(await mkdtemp(join(tmpdir(), 'flag-loaders-')));
    assetsDir = flagPaths(root).assetsDir;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  const writeFlag = async (code: string, svg: string) => {
    await mkdir(assetsDir, { recursive: true });
    await writeFile(join(assetsDir, `${code}.svg`), svg, 'utf8');
  };

  it('refuses to run when the assets directory is missing', async () => {
    await expect(main(root)).rejects.toThrow('process.exit(1)');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('refresh-flags.mjs first'));
  });

  it('refuses to emit an empty corpus', async () => {
    await mkdir(assetsDir, { recursive: true });
    await writeFile(join(assetsDir, 'README.md'), 'not a flag\n', 'utf8');

    await expect(main(root)).rejects.toThrow('process.exit(1)');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('no .svg files'));
  });

  it('writes both delivery shapes from the same assets', async () => {
    await writeFlag('be', '<svg id="be"/>\n');
    await writeFlag('fr', '<svg id="fr"/>\n');

    await main(root);

    const { loadersPath, bundlePath } = flagPaths(root);
    const loaders = await readFile(loadersPath, 'utf8');
    const bundle = await readFile(bundlePath, 'utf8');

    expect(loaders).toContain("  'be': () => import('./assets/be.svg?raw').then((m) => m.default),");
    expect(loaders).toContain("export type CountryCode =\n  | 'be'\n  | 'fr';");
    expect(bundle).toContain(`  'fr': ${JSON.stringify('<svg id="fr"/>\n')},`);
  });

  // `?raw` hands the per-flag chunk the file's exact bytes, so the bundle must
  // not trim: the two delivery shapes have to return the same string.
  it('inlines the SVG verbatim, whitespace included', async () => {
    const svg = '  <svg id="be"/>  \n\n';
    await writeFlag('be', svg);

    await main(root);

    expect(await readFile(flagPaths(root).bundlePath, 'utf8')).toContain(JSON.stringify(svg));
  });

  it('reports the flag count and both file verdicts', async () => {
    await writeFlag('be', '<svg/>\n');

    await main(root);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1 flag(s)'));
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('wrote   libs/mintplayer-web-components/flags/src/flag-loaders.generated.ts'),
    );
  });

  it('is idempotent — a second run skips both writes', async () => {
    await writeFlag('be', '<svg/>\n');
    await main(root);
    vi.mocked(console.log).mockClear();

    await main(root);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('skipped libs/mintplayer-web-components/flags/src/flag-loaders.generated.ts'),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('skipped libs/mintplayer-web-components/flags/src/all-flags.generated.ts'),
    );
  });
});
