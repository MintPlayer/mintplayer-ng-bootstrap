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
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { buildReadme, flagPaths, parseOnly, wantedCodes } from './refresh-flags.mjs';

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
