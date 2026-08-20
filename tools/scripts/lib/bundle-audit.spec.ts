import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  auditHljsImports,
  dynamicSpecifiersOf,
  missingEntryReport,
  parseMaxBytes,
  relForDisplay,
  reportBundle,
  resolveBuiltEntry,
  staticSpecifiersOf,
} from './bundle-audit.mjs';

describe('staticSpecifiersOf', () => {
  it.each([
    ['default import', "import hljs from 'highlight.js';", 'highlight.js'],
    ['named import', "import { a } from 'x';", 'x'],
    ['namespace import', "import * as a from 'x';", 'x'],
    ['bare side-effect import', "import 'x';", 'x'],
    ['re-export', "export { a } from 'x';", 'x'],
    ['star re-export', "export * from 'x';", 'x'],
    ['double quotes', 'import a from "x";', 'x'],
  ])('finds a %s', (_label, source, expected) => {
    expect(staticSpecifiersOf(source)).toContain(expected);
  });

  it('finds an import that is not at the start of a line', () => {
    expect(staticSpecifiersOf("const a = 1;import b from 'x';")).toEqual(['x']);
  });

  it('finds several imports in one bundle', () => {
    const source = ["import a from 'x';", "import b from 'y';", "export * from 'z';"].join('\n');
    expect(staticSpecifiersOf(source)).toEqual(['x', 'y', 'z']);
  });

  // The pattern excludes parens specifically so a dynamic import is not counted
  // as a static one — that distinction is the whole point of the guard.
  it('does not count a dynamic import', () => {
    expect(staticSpecifiersOf("const m = await import('x');")).toEqual([]);
  });
});

describe('dynamicSpecifiersOf', () => {
  it.each([
    ['plain', "import('x')"],
    ['awaited', "await import('x')"],
    ['whitespace inside the call', "import(  'x'  )"],
    ['double quotes', 'import("x")'],
    ['in a returned arrow', "() => import('x')"],
  ])('finds a %s dynamic import', (_label, source) => {
    expect(dynamicSpecifiersOf(source)).toEqual(['x']);
  });

  it('does not count a static import', () => {
    expect(dynamicSpecifiersOf("import a from 'x';")).toEqual([]);
  });

  // A computed specifier cannot be audited, and is separately banned by the
  // workspace's own rules — it must not be silently reported as absent-and-fine.
  it('does not match a computed specifier', () => {
    expect(dynamicSpecifiersOf('import(`./x/${k}.js`)')).toEqual([]);
  });
});

describe('auditHljsImports', () => {
  const lazy = [
    "import hljs from 'highlight.js/lib/core';",
    "const loaders = { ts: () => import('highlight.js/lib/languages/typescript') };",
  ].join('\n');

  it('passes a build where only lib/core is static and grammars are dynamic', () => {
    expect(auditHljsImports(lazy).failures).toEqual([]);
  });

  it('reports what it found', () => {
    const { staticHljs, dynamicHljs } = auditHljsImports(lazy);
    expect(staticHljs).toEqual(['highlight.js/lib/core']);
    expect(dynamicHljs).toEqual(['highlight.js/lib/languages/typescript']);
  });

  it('fails a static import of a grammar', () => {
    const source = `${lazy}\nimport ts from 'highlight.js/lib/languages/typescript';`;
    expect(auditHljsImports(source).failures).toEqual([
      expect.stringContaining('static import of "highlight.js/lib/languages/typescript"'),
    ]);
  });

  // The regression this guard exists for: `external` in the WC build means a
  // static hljs import costs ~60 bytes here and 53.7 KB gzip in the consumer's
  // bundle, so no size budget would ever catch it.
  it('fails a static import of lib/common', () => {
    const source = `${lazy}\nimport hljs from 'highlight.js/lib/common';`;
    expect(auditHljsImports(source).failures).toEqual([
      expect.stringContaining('static import of "highlight.js/lib/common"'),
    ]);
  });

  it('fails a static import of the bare library', () => {
    const source = `${lazy}\nimport hljs from 'highlight.js';`;
    expect(auditHljsImports(source).failures).toEqual([
      expect.stringContaining('static import of "highlight.js"'),
    ]);
  });

  it('fails a dynamic import of the full bare library', () => {
    const source = "import hljs from 'highlight.js/lib/core';\nconst m = import('highlight.js');";
    expect(auditHljsImports(source).failures).toEqual([
      expect.stringContaining('dynamic import of the FULL'),
    ]);
  });

  // No dynamic import at all means the loader map was dropped or inlined: the
  // guarantee is gone even though no per-specifier rule fired.
  it('fails a build with no dynamic hljs import at all', () => {
    expect(auditHljsImports("import hljs from 'highlight.js/lib/core';").failures).toEqual([
      expect.stringContaining('no dynamic highlight.js import found'),
    ]);
  });

  it('ignores non-hljs imports entirely', () => {
    const source = `${lazy}\nimport { html } from 'lit';\nconst x = import('./other.js');`;
    expect(auditHljsImports(source).failures).toEqual([]);
  });

  it('reports every violation, not just the first', () => {
    const source = [
      "import hljs from 'highlight.js/lib/core';",
      "import ts from 'highlight.js/lib/languages/typescript';",
      "import common from 'highlight.js/lib/common';",
      "const m = import('highlight.js');",
    ].join('\n');
    expect(auditHljsImports(source).failures).toHaveLength(3);
  });
});

describe('parseMaxBytes', () => {
  it('returns the fallback when --max is absent', () => {
    expect(parseMaxBytes([], 40960)).toBe(40960);
  });

  it('reads the value after --max', () => {
    expect(parseMaxBytes(['--max', '25000'], 40960)).toBe(25000);
  });

  it('reads --max from among other arguments', () => {
    expect(parseMaxBytes(['--verbose', '--max', '25000', '--other'], 40960)).toBe(25000);
  });

  // Previously `Number(args[maxIdx + 1])` produced NaN for each of these, and
  // `size > NaN` is false — so a typo silently disabled the budget rather than
  // failing loudly.
  it.each([
    ['a non-numeric value', ['--max', 'twenty']],
    ['a missing value', ['--max']],
    ['a negative value', ['--max', '-5']],
    ['zero', ['--max', '0']],
  ])('falls back on %s rather than disabling the budget', (_label, args) => {
    expect(parseMaxBytes(args, 40960)).toBe(40960);
  });
});

// ===========================================================================
// resolveBuiltEntry / relForDisplay / missingEntryReport / reportBundle
//
// The mechanics both built-artifact guards share. `exists` is injected, so no
// case here needs a build — which is the point of the extraction.
// ===========================================================================

describe('resolveBuiltEntry', () => {
  const repoRoot = join('repo', 'root');
  const candidates = ['dist/a/index.mjs', 'dist/a.mjs'];

  it('returns the first candidate that exists, resolved against the repo root', () => {
    const found = resolveBuiltEntry(repoRoot, candidates, () => true);
    expect(found).toBe(resolve(repoRoot, 'dist/a/index.mjs'));
  });

  it('falls through to a later candidate when the first is absent', () => {
    const second = resolve(repoRoot, 'dist/a.mjs');
    expect(resolveBuiltEntry(repoRoot, candidates, (p) => p === second)).toBe(second);
  });

  it('returns undefined when nothing is built', () => {
    expect(resolveBuiltEntry(repoRoot, candidates, () => false)).toBeUndefined();
  });

  it('returns undefined for an empty candidate list', () => {
    expect(resolveBuiltEntry(repoRoot, [], () => true)).toBeUndefined();
  });

  it('asks about absolute paths, never the repo-relative candidate strings', () => {
    const asked: string[] = [];
    resolveBuiltEntry(repoRoot, candidates, (p) => {
      asked.push(p);
      return false;
    });
    expect(asked).toEqual(candidates.map((c) => resolve(repoRoot, c)));
  });
});

describe('relForDisplay', () => {
  it('shows a path under the repo root as ./-relative and posix-separated', () => {
    const repoRoot = join('repo', 'root');
    expect(relForDisplay(join(repoRoot, 'dist', 'a', 'index.mjs'), repoRoot)).toBe(
      './dist/a/index.mjs',
    );
  });

  it('normalises separators even for a path outside the repo root', () => {
    // A pure string transform, not a path fixture: no filesystem reads this,
    // so the backslashes mean the same thing on every platform.
    expect(relForDisplay('D:\\elsewhere\\a.mjs', join('repo', 'root'))).toBe('D:/elsewhere/a.mjs');
  });
});

describe('missingEntryReport', () => {
  const lines = missingEntryReport('check-x', ['dist/a.mjs', 'dist/b.mjs'], 'npx nx build x');

  it('names the guard that failed', () => {
    expect(lines[0]).toBe('[check-x] no built entry found. Tried:');
  });

  it('lists every candidate it tried, in order', () => {
    expect(lines.slice(1, 3)).toEqual(['  - dist/a.mjs', '  - dist/b.mjs']);
  });

  it('ends with the build that would produce one', () => {
    expect(lines).toContain('  npx nx build x');
  });
});

describe('reportBundle', () => {
  const repoRoot = join('repo', 'root');
  const path = join(repoRoot, 'dist', 'a.mjs');
  const contents = 'x'.repeat(4096);

  it('heads the report with the guard label and the relative path', () => {
    const { lines } = reportBundle({ label: 'check-x', path, repoRoot, contents });
    expect(lines[0]).toBe('[check-x] ./dist/a.mjs');
  });

  it('reports the raw size in kB', () => {
    const { lines, rawBytes } = reportBundle({ label: 'check-x', path, repoRoot, contents });
    expect(rawBytes).toBe(4096);
    expect(lines[1]).toBe('  raw:  4.00 kB');
  });

  it('reports a gzipped size smaller than the raw one, and no budget by default', () => {
    const { lines, gzipBytes } = reportBundle({ label: 'check-x', path, repoRoot, contents });
    expect(gzipBytes).toBeLessThan(4096);
    expect(lines[2]).toBe(`  gzip: ${(gzipBytes / 1024).toFixed(2)} kB`);
  });

  it('annotates the gzip line with the budget when one is given', () => {
    const { lines } = reportBundle({
      label: 'check-x',
      path,
      repoRoot,
      contents,
      maxBytes: 40 * 1024,
    });
    expect(lines[2]).toMatch(/ {2}\(budget: 40\.00 kB\)$/);
  });

  it('measures a Buffer and the equivalent string identically', () => {
    const asString = reportBundle({ label: 'x', path, repoRoot, contents });
    const asBuffer = reportBundle({ label: 'x', path, repoRoot, contents: Buffer.from(contents) });
    expect(asBuffer).toEqual(asString);
  });

  // The raw figure is bytes, not characters: a multi-byte bundle read as a
  // string would otherwise be reported smaller than it ships.
  it('counts bytes rather than characters for multi-byte content', () => {
    const { rawBytes } = reportBundle({ label: 'x', path, repoRoot, contents: '€'.repeat(10) });
    expect(rawBytes).toBe(30);
  });
});
