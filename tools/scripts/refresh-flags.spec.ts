/**
 * The flag vendoring script. It ranked nowhere in the `tools/` audits — the
 * ranking never summed to its own measured total, and this file was the
 * remainder — while being the only writer of 244 committed SVGs and of the
 * flags README.
 *
 * The module is side-effect-free on import: argv parsing and the CLI sit behind
 * an isEntryPoint guard and every path is a defaulted parameter.
 *
 * Deliberately NOT covered: `resolveSource`, which shells out through
 * `execFileSync` to `npm pack country-flag-icons@<pinned>` and then `tar -xzf`
 * to fetch the artwork. It needs the network and a tar binary, and it is a
 * once-a-year manual ritual — exercising it in CI would buy a flaky test, not a
 * guarantee.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { rawCountryData } from 'intl-tel-input/data';

import { buildReadme, flagPaths, main, parseOnly, wantedCodes } from './refresh-flags.mjs';

describe('parseOnly', () => {
  it('returns null when --only is absent — the only mode allowed to prune', () => {
    expect(parseOnly([])).toBeNull();
  });

  it('reads a comma-separated subset', () => {
    expect(parseOnly(['--only=be,fr'])).toEqual(new Set(['be', 'fr']));
  });

  it('lowercases the codes so an ISO-style BE matches the vendored be.svg', () => {
    expect(parseOnly(['--only=BE,Fr'])).toEqual(new Set(['be', 'fr']));
  });

  it('trims whitespace around the codes', () => {
    expect(parseOnly(['--only=be , fr'])).toEqual(new Set(['be', 'fr']));
  });

  it('drops blanks from a trailing or doubled comma', () => {
    expect(parseOnly(['--only=be,,fr,'])).toEqual(new Set(['be', 'fr']));
  });

  // An empty set is NOT null: `--only=` means "no flags", which must still be
  // refused the pruning that a full refresh is allowed to do.
  it('returns an empty set for an empty value rather than falling back to a full refresh', () => {
    expect(parseOnly(['--only='])).toEqual(new Set());
  });

  it('finds --only among other arguments', () => {
    expect(parseOnly(['--verbose', '--only=be'])).toEqual(new Set(['be']));
  });
});

describe('wantedCodes', () => {
  const countryData = [
    ['BE', '32'],
    ['FR', '33'],
    ['AT', '43'],
  ];

  it('lowercases and sorts the full dial-code set', () => {
    expect(wantedCodes(countryData, null)).toEqual(['at', 'be', 'fr']);
  });

  it('narrows to the --only subset', () => {
    expect(wantedCodes(countryData, new Set(['be', 'fr']))).toEqual(['be', 'fr']);
  });

  // The caller diffs `only` against this result to report codes that have no
  // dial code, so an unknown code must be dropped rather than passed through.
  it('drops a code that is not in the dial-code table', () => {
    expect(wantedCodes(countryData, new Set(['be', 'zz']))).toEqual(['be']);
  });

  it('returns nothing for an empty subset', () => {
    expect(wantedCodes(countryData, new Set())).toEqual([]);
  });
});

describe('flagPaths', () => {
  it('locates the assets dir inside the flags web-component', () => {
    const repoRoot = join('repo', 'root');
    const { flagsRoot, assetsDir } = flagPaths(repoRoot);

    expect(flagsRoot).toBe(join(repoRoot, 'libs', 'mintplayer-web-components', 'flags'));
    expect(assetsDir).toBe(join(flagsRoot, 'src', 'assets'));
  });
});

describe('buildReadme', () => {
  const roots: string[] = [];
  const licenseAt = (notice: string) => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'mp-refresh-flags-')));
    roots.push(dir);
    const path = join(dir, 'LICENSE');
    // Written at runtime with explicit \n: a committed fixture would be
    // rewritten by autocrlf and the trim/embed assertions would drift.
    writeFileSync(path, `${notice}\n\n`.replace(/\r?\n/g, '\n'), 'utf8');
    return path;
  };

  afterAll(() => {
    for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  });

  it('embeds the upstream version and license in the attribution line', async () => {
    const readme = await buildReadme({ version: '1.6.20', license: 'MIT' }, licenseAt('(c) someone'));
    expect(readme).toContain('country-flag-icons) v1.6.20, which is MIT-licensed');
  });

  it('embeds the license notice verbatim, trimmed, inside a fenced block', async () => {
    const readme = await buildReadme({ version: '1.6.20', license: 'MIT' }, licenseAt('(c) someone'));
    expect(readme).toContain('```\n(c) someone\n```');
  });

  it('keeps the notice multi-line rather than collapsing it', async () => {
    const readme = await buildReadme(
      { version: '1.6.20', license: 'MIT' },
      licenseAt('MIT License\n\nCopyright (c) someone'),
    );
    expect(readme).toContain('MIT License\n\nCopyright (c) someone');
  });

  it('opens with the package heading and documents both load functions', async () => {
    const readme = await buildReadme({ version: '1.6.20', license: 'MIT' }, licenseAt('x'));
    expect(readme.split('\n')[0]).toBe('# `@mintplayer/web-components/flags`');
    expect(readme).toContain('loadAllFlags');
    expect(readme).toContain('loadFlag');
  });

  // The SVGs are committed sources; the two `.generated.ts` loader maps are
  // not. Saying so in the README is how a contributor knows which to stage.
  it('states which flag files are committed and which are build artifacts', async () => {
    const readme = await buildReadme({ version: '1.6.20', license: 'MIT' }, licenseAt('x'));
    expect(readme).toContain('`src/assets/*.svg` are **vendored sources**');
    expect(readme).toContain('gitignored');
  });

  it('writes LF newlines only, so the generated README is byte-stable across platforms', async () => {
    const readme = await buildReadme({ version: '1.6.20', license: 'MIT' }, licenseAt('x'));
    expect(readme).not.toContain('\r');
  });

  it('ends with a trailing newline', async () => {
    const readme = await buildReadme({ version: '1.6.20', license: 'MIT' }, licenseAt('x'));
    expect(readme.endsWith('\n')).toBe(true);
  });
});

// ===========================================================================
// main() — reachable only because `fetchSource` is injectable. Before that
// seam existed, ~60 of this file's 64 lines could not run in a spec, including
// the pruning branch, which unlinks committed SVGs.
// ===========================================================================

describe('main', () => {
  const roots: string[] = [];

  afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

  /**
   * A repo root with a pre-populated flags dir, plus a fake upstream package
   * carrying the given uppercase SVG names. Returns the paths plus a spy-ish
   * record of whether cleanup ran.
   */
  function scenario(options: {
    upstream: string[];
    existingAssets?: string[];
  }): {
    repoRoot: string;
    assetsDir: string;
    flagsRoot: string;
    fetchSource: () => Promise<{ dir: string; cleanup: () => Promise<void> }>;
    cleanedUp: () => boolean;
  } {
    const repoRoot = realpathSync(mkdtempSync(join(tmpdir(), 'refresh-flags-')));
    roots.push(repoRoot);

    const { flagsRoot, assetsDir } = flagPaths(repoRoot);
    mkdirSync(assetsDir, { recursive: true });
    for (const name of options.existingAssets ?? []) {
      writeFileSync(join(assetsDir, name), '<svg>stale</svg>\n');
    }

    const packageDir = join(repoRoot, 'fake-upstream', 'package');
    mkdirSync(join(packageDir, '3x2'), { recursive: true });
    for (const name of options.upstream) {
      // Untrimmed on purpose: main() trims and appends exactly one newline.
      writeFileSync(join(packageDir, '3x2', `${name}.svg`), `  <svg>${name}</svg>  \n\n`);
    }
    writeFileSync(join(packageDir, 'LICENSE'), 'MIT-ish license text\n');
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ version: '9.9.9' }));

    let cleaned = false;
    return {
      repoRoot,
      assetsDir,
      flagsRoot,
      fetchSource: async () => ({
        dir: packageDir,
        cleanup: async () => {
          cleaned = true;
        },
      }),
      cleanedUp: () => cleaned,
    };
  }

  const svgsIn = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();

  it('vendors every dial-code flag the upstream package provides', async () => {
    // The real country table has ~244 entries; --only keeps the fixture small
    // while still exercising the write path.
    const s = scenario({ upstream: ['BE', 'FR'] });
    await main(['--only=be,fr'], s.repoRoot, s.fetchSource);

    expect(svgsIn(s.assetsDir)).toEqual(['be.svg', 'fr.svg']);
  });

  it('copies the artwork byte-for-byte, trimmed, with exactly one trailing newline', async () => {
    // An upstream bump should read as a content diff, not a reformat.
    const s = scenario({ upstream: ['BE'] });
    await main(['--only=be'], s.repoRoot, s.fetchSource);

    expect(readFileSync(join(s.assetsDir, 'be.svg'), 'utf8')).toBe('<svg>BE</svg>\n');
  });

  it('is idempotent — a second run writes nothing', async () => {
    const s = scenario({ upstream: ['BE'] });
    await main(['--only=be'], s.repoRoot, s.fetchSource);
    const first = readFileSync(join(s.assetsDir, 'be.svg'), 'utf8');

    await main(['--only=be'], s.repoRoot, s.fetchSource);

    expect(readFileSync(join(s.assetsDir, 'be.svg'), 'utf8')).toBe(first);
  });

  it('writes the README with the fetched package version', async () => {
    const s = scenario({ upstream: ['BE'] });
    await main(['--only=be'], s.repoRoot, s.fetchSource);

    expect(readFileSync(join(s.flagsRoot, 'README.md'), 'utf8')).toContain('9.9.9');
  });

  it('releases the fetched tarball even on the happy path', async () => {
    const s = scenario({ upstream: ['BE'] });
    await main(['--only=be'], s.repoRoot, s.fetchSource);
    expect(s.cleanedUp()).toBe(true);
  });

  describe('pruning — the destructive branch', () => {
    it('does NOT prune during a partial refresh, however stale the extra file', async () => {
      // Only a full refresh knows the complete set. A --only run that pruned
      // would delete every flag it was not asked about.
      const s = scenario({ upstream: ['BE'], existingAssets: ['zz.svg', 'xx.svg'] });

      await main(['--only=be'], s.repoRoot, s.fetchSource);

      expect(svgsIn(s.assetsDir)).toEqual(['be.svg', 'xx.svg', 'zz.svg']);
    });

    it('does NOT prune for --only= either, which parses to an empty set, not null', async () => {
      // The empty-set/null distinction exists precisely to keep this branch shut.
      const s = scenario({ upstream: [], existingAssets: ['zz.svg'] });

      await main(['--only='], s.repoRoot, s.fetchSource);

      expect(svgsIn(s.assetsDir)).toEqual(['zz.svg']);
    });

    // A full refresh must actually succeed to reach the prune, which means
    // the fake upstream has to carry every dial-code flag. Anything less hits
    // the missing-flag refusal first and the prune never runs — which is how
    // an earlier version of these tests passed without testing pruning at all.
    const ALL_CODES = wantedCodes(rawCountryData, null);

    it('deletes a vendored SVG that is no longer a dial-code country', async () => {
      // The destructive behaviour, exercised for the first time: `zz` was
      // vendored once, upstream no longer lists it, so it goes.
      const s = scenario({
        upstream: ALL_CODES.map((c) => c.toUpperCase()),
        existingAssets: ['zz.svg'],
      });

      await main([], s.repoRoot, s.fetchSource);

      expect(existsSync(join(s.assetsDir, 'zz.svg'))).toBe(false);
      expect(svgsIn(s.assetsDir)).toEqual(ALL_CODES.map((c) => `${c}.svg`));
    });

    it('leaves non-SVG files alone even on a full refresh', async () => {
      const s = scenario({ upstream: ALL_CODES.map((c) => c.toUpperCase()) });
      writeFileSync(join(s.assetsDir, 'README.txt'), 'keep me');

      await main([], s.repoRoot, s.fetchSource);

      expect(existsSync(join(s.assetsDir, 'README.txt'))).toBe(true);
    });
  });

  describe('refusals', () => {
    /**
     * The refusal branches call `process.exit(1)` and then fall through rather
     * than returning, so the guard rests on exit semantics rather than
     * structure. Making the spy throw both stops the worker being killed and
     * pins that nothing after the refusal runs.
     */
    function exitGuard() {
      const errors: string[] = [];
      vi.spyOn(console, 'error').mockImplementation((...args) => {
        errors.push(args.join(' '));
      });
      vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        throw new Error(`process.exit(${code})`);
      }) as never);
      return { errors };
    }

    afterEach(() => vi.restoreAllMocks());

    it('refuses when the fetched package has no 3x2 directory', async () => {
      const s = scenario({ upstream: ['BE'] });
      rmSync(join(s.repoRoot, 'fake-upstream', 'package', '3x2'), { recursive: true });
      const { errors } = exitGuard();

      await expect(main(['--only=be'], s.repoRoot, s.fetchSource)).rejects.toThrow('process.exit(1)');
      expect(errors.join('\n')).toContain('the fetched package looks wrong');
    });

    it('refuses an --only naming a country that has no dial code', async () => {
      const s = scenario({ upstream: ['BE'] });
      const { errors } = exitGuard();

      await expect(main(['--only=zz'], s.repoRoot, s.fetchSource)).rejects.toThrow('process.exit(1)');
      expect(errors.join('\n')).toContain('zz');
    });

    it('refuses, rather than silently skipping, when upstream lacks a wanted flag', async () => {
      // A missing flag means the pinned package changed shape; carrying on
      // would ship a phone-input with a blank country.
      const s = scenario({ upstream: [] });
      const { errors } = exitGuard();

      await expect(main(['--only=be'], s.repoRoot, s.fetchSource)).rejects.toThrow('process.exit(1)');
      expect(errors.join('\n')).toContain('no upstream flag for: be');
    });

    it('refuses BEFORE pruning, so a bad fetch cannot empty the flags directory', async () => {
      // The ordering is the safety property: the missing-flag refusal sits
      // above the prune, so an upstream that returned nothing deletes nothing.
      const s = scenario({ upstream: [], existingAssets: ['be.svg', 'fr.svg'] });
      exitGuard();

      await expect(main([], s.repoRoot, s.fetchSource)).rejects.toThrow('process.exit(1)');

      expect(svgsIn(s.assetsDir)).toEqual(['be.svg', 'fr.svg']);
    });
  });
});
