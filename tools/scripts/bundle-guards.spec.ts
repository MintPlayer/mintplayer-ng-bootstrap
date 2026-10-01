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
 * The CLI bodies are covered too, through each script's main({ repoRoot })
 * against a temp repo (exit codes: 2 = nothing built, 1 = the guard failed).
 * A subprocess case would instead read the real dist/ and pass or fail
 * depending on whether a build happened to have run.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { resolveBuiltEntry } from './lib/bundle-audit.mjs';
import {
  BUILD_COMMAND as HLJS_BUILD_COMMAND,
  ENTRY_CANDIDATES,
  LABEL as HLJS_LABEL,
  main as hljsMain,
  REPO_ROOT as HLJS_REPO_ROOT,
} from './check-code-snippet-hljs-lazy.mjs';
import {
  BUILD_COMMAND as RIBBON_BUILD_COMMAND,
  DEFAULT_MAX_BYTES,
  FESM_CANDIDATES,
  LABEL as RIBBON_LABEL,
  main as ribbonMain,
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

// ===========================================================================
// The CLIs themselves, through main({ repoRoot }) against a temp repo — so the
// verdict depends on the fixture, never on whether a real build happened to run.
// ===========================================================================

const guardRoots: string[] = [];
function repoWith(files: Record<string, string | Buffer>): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'mp-bundle-guard-')));
  guardRoots.push(root);
  Object.entries(files).map(([rel, content]) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  });
  return root;
}
afterAll(() => guardRoots.map((root) => rmSync(root, { recursive: true, force: true })));

function capture() {
  const log = vi.fn();
  const error = vi.fn();
  return {
    log,
    error,
    logged: () => log.mock.calls.map(([l]) => String(l)),
    errored: () => error.mock.calls.map(([l]) => String(l)),
  };
}

describe('check-code-snippet-hljs-lazy main', () => {
  const entry = ENTRY_CANDIDATES[0];

  it('exits 2 with the build hint when nothing is built', () => {
    const io = capture();
    expect(hljsMain({ repoRoot: repoWith({}), ...io })).toBe(2);
    expect(io.errored()).toContain('  npx nx build mintplayer-web-components');
  });

  it('passes a build that imports only lib/core statically and grammars on demand', () => {
    const io = capture();
    const source =
      "import hljs from 'highlight.js/lib/core';\n" +
      "const load = { ts: () => import('highlight.js/lib/languages/typescript') };\n";
    expect(hljsMain({ repoRoot: repoWith({ [entry]: source }), ...io })).toBe(0);
    expect(io.logged()).toContain('  static hljs imports:  highlight.js/lib/core');
    expect(io.logged()).toContain('  dynamic hljs imports: 1');
    expect(io.logged().at(-1)).toBe('\n✅ grammars load on demand; only lib/core is static.');
  });

  it('fails a build that imports the common bundle eagerly, listing why', () => {
    const io = capture();
    const source = "import hljs from 'highlight.js/lib/common';\n";
    expect(hljsMain({ repoRoot: repoWith({ [entry]: source }), ...io })).toBe(1);
    expect(io.errored()[0]).toBe('\n❌ highlight.js is no longer lazily loaded:');
    expect(io.errored().slice(1).join('\n')).toMatch(/static import of "highlight.js\/lib\/common"/);
    expect(io.errored().slice(1).join('\n')).toMatch(/no dynamic highlight.js import found/);
    expect(io.logged()).toContain('  static hljs imports:  highlight.js/lib/common');
  });

  it('reports "(none)" when there is no static hljs import at all', () => {
    const io = capture();
    const source = "const x = () => import('highlight.js/lib/common');\n";
    hljsMain({ repoRoot: repoWith({ [entry]: source }), ...io });
    expect(io.logged()).toContain('  static hljs imports:  (none)');
  });
});

describe('check-ribbon-bundle-size main', () => {
  const fesm = FESM_CANDIDATES[1];
  // Random bytes do not compress, so the gzip size is known to exceed a small budget.
  const incompressible = randomBytes(4096);

  it('exits 2 with the build hint when the Angular library is not built', () => {
    const io = capture();
    expect(ribbonMain({ argv: [], repoRoot: repoWith({}), ...io })).toBe(2);
    expect(io.errored()).toContain('  npx nx build mintplayer-ng-bootstrap');
  });

  it('passes a bundle within the default budget, printing the size header', () => {
    const io = capture();
    expect(ribbonMain({ argv: [], repoRoot: repoWith({ [fesm]: 'export const x = 1;\n' }), ...io })).toBe(0);
    expect(io.logged()[0]).toBe(`[check-ribbon-bundle-size] ./${fesm}`);
    expect(io.logged().at(-1)).toMatch(/^✅ Within budget \(\d+ \/ 40960 bytes\)\.$/);
  });

  it('fails a bundle over a --max budget, naming the overshoot and how to investigate', () => {
    const io = capture();
    expect(ribbonMain({ argv: ['--max', '1024'], repoRoot: repoWith({ [fesm]: incompressible }), ...io })).toBe(1);
    expect(io.errored()[0]).toMatch(/^\n❌ Ribbon FESM exceeds gzipped budget by \d+ bytes \(\d+\.\d\d kB > 1\.00 kB\)\.$/);
    expect(io.errored()[1]).toBe(`Investigate with: npx source-map-explorer ./${fesm}`);
  });
});
