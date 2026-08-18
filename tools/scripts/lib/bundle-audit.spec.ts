import { describe, expect, it } from 'vitest';

import {
  auditHljsImports,
  dynamicSpecifiersOf,
  parseMaxBytes,
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
