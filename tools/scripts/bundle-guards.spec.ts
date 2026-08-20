/**
 * The two built-artifact guards, after their shared mechanics moved into
 * lib/bundle-audit.mjs (`resolveBuiltEntry`, `reportBundle`,
 * `missingEntryReport`). What is left in each script is its own knowledge:
 * where its artifact may live, in which order, and which build produces it.
 *
 * That knowledge is exactly what rots — a build-output rename leaves the guard
 * "passing" by never running — so the candidate lists are pinned here and
 * driven through `resolveBuiltEntry` with an injected `exists`, needing no
 * build.
 *
 * Deliberately NOT covered: the isEntryPoint CLI blocks and their exit codes
 * (2 = nothing built, 1 = the guard failed). They derive their repo root from
 * `import.meta.url`, so a subprocess case would read the real `dist/` and pass
 * or fail depending on whether a build happened to have run.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveBuiltEntry } from './lib/bundle-audit.mjs';
import {
  BUILD_COMMAND as HLJS_BUILD_COMMAND,
  ENTRY_CANDIDATES,
  LABEL as HLJS_LABEL,
  REPO_ROOT as HLJS_REPO_ROOT,
} from './check-code-snippet-hljs-lazy.mjs';
import {
  BUILD_COMMAND as RIBBON_BUILD_COMMAND,
  DEFAULT_MAX_BYTES,
  FESM_CANDIDATES,
  LABEL as RIBBON_LABEL,
  REPO_ROOT as RIBBON_REPO_ROOT,
} from './check-ribbon-bundle-size.mjs';

describe('check-code-snippet-hljs-lazy', () => {
  it('names candidates relative to the repo root, posix-separated', () => {
    for (const candidate of ENTRY_CANDIDATES) {
      expect(candidate).toMatch(/^dist\/[a-z0-9/.-]+\.mjs$/);
    }
  });

  it('prefers the per-entrypoint output over the flat one', () => {
    expect(ENTRY_CANDIDATES).toEqual([
      'dist/libs/mintplayer-web-components/code-snippet/index.mjs',
      'dist/libs/mintplayer-web-components/code-snippet.mjs',
    ]);
  });

  it('resolves the first existing candidate against its own repo root', () => {
    const expected = resolve(HLJS_REPO_ROOT, ENTRY_CANDIDATES[1]);
    expect(resolveBuiltEntry(HLJS_REPO_ROOT, ENTRY_CANDIDATES, (p) => p === expected)).toBe(
      expected,
    );
  });

  it('resolves to nothing when the web-components library has not been built', () => {
    expect(resolveBuiltEntry(HLJS_REPO_ROOT, ENTRY_CANDIDATES, () => false)).toBeUndefined();
  });

  // The repo root is derived from import.meta.url — two levels up from
  // tools/scripts/. A wrong one silently makes every candidate absent, and the
  // guard then "passes" by never running.
  it('derives a repo root the script itself sits under', () => {
    expect(
      existsSync(resolve(HLJS_REPO_ROOT, 'tools/scripts/check-code-snippet-hljs-lazy.mjs')),
    ).toBe(true);
  });

  it('points at the build that produces its artifact', () => {
    expect(HLJS_LABEL).toBe('check-code-snippet-hljs-lazy');
    expect(HLJS_BUILD_COMMAND).toContain('mintplayer-web-components');
  });
});

describe('check-ribbon-bundle-size', () => {
  it('names candidates relative to the repo root, posix-separated', () => {
    for (const candidate of FESM_CANDIDATES) {
      expect(candidate).toMatch(/^dist\/[a-z0-9/.-]+\.mjs$/);
    }
  });

  // ng-packagr namespaces a secondary entry's FESM by the umbrella lib name,
  // and the dist layout differs between the two build configurations — hence
  // two candidates rather than one path.
  it('tries both dist layouts for the ribbon FESM', () => {
    expect(FESM_CANDIDATES).toEqual([
      'dist/libs/mintplayer-ng-bootstrap/fesm2022/mintplayer-ng-bootstrap-ribbon.mjs',
      'dist/mintplayer-ng-bootstrap/fesm2022/mintplayer-ng-bootstrap-ribbon.mjs',
    ]);
  });

  it('resolves the first existing candidate against its own repo root', () => {
    const expected = resolve(RIBBON_REPO_ROOT, FESM_CANDIDATES[0]);
    expect(resolveBuiltEntry(RIBBON_REPO_ROOT, FESM_CANDIDATES, () => true)).toBe(expected);
  });

  it('resolves to nothing when the Angular library has not been built', () => {
    expect(resolveBuiltEntry(RIBBON_REPO_ROOT, FESM_CANDIDATES, () => false)).toBeUndefined();
  });

  it('derives a repo root the script itself sits under', () => {
    expect(
      existsSync(resolve(RIBBON_REPO_ROOT, 'tools/scripts/check-ribbon-bundle-size.mjs')),
    ).toBe(true);
  });

  // The negotiated budget, in bytes. Stated as 40 kB in the script's header —
  // pinned so a "harmless" bump has to be a deliberate edit here too.
  it('budgets 40 kB gzip by default', () => {
    expect(DEFAULT_MAX_BYTES).toBe(40960);
    expect(RIBBON_LABEL).toBe('check-ribbon-bundle-size');
    expect(RIBBON_BUILD_COMMAND).toContain('mintplayer-ng-bootstrap');
  });
});
