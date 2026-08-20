import { describe, expect, it } from 'vitest';

import {
  buildFlagBundleModule,
  buildFlagLoadersModule,
  buildHljsLoaderModule,
} from './loader-maps.mjs';

/**
 * Every specifier these modules emit must be a static string literal. A computed
 * one survives into the published .mjs and then either hard-fails a consumer's
 * esbuild build or — worse, silently — globs the whole target directory into
 * their bundle. This is the assertion that pins that guarantee.
 */
const hasOnlyStaticImports = (source: string) =>
  [...source.matchAll(/\bimport\(([^)]*)\)/g)].every(([, arg]) => /^\s*'[^'$`]+'\s*$/.test(arg));

describe('buildHljsLoaderModule', () => {
  const entries = [
    { id: 'typescript', aliases: ['ts', 'tsx'] },
    { id: 'xml', aliases: ['html', 'svg'] },
  ];
  const module = buildHljsLoaderModule(entries);

  it('marks the file as generated', () => {
    expect(module).toContain('// AUTO-GENERATED — do not edit by hand.');
  });

  it('emits a loader for every id', () => {
    expect(module).toContain("'typescript': () => import('highlight.js/lib/languages/typescript')");
    expect(module).toContain("'xml': () => import('highlight.js/lib/languages/xml')");
  });

  // `language="tsx"` and `language="html"` must resolve rather than falling
  // through to auto-detect, so aliases get their own keys pointing at the
  // grammar that owns them.
  it('emits a loader for every alias, targeting the canonical grammar', () => {
    expect(module).toContain("'tsx': () => import('highlight.js/lib/languages/typescript')");
    expect(module).toContain("'html': () => import('highlight.js/lib/languages/xml')");
  });

  it('maps every key back to its canonical id', () => {
    expect(module).toContain("'tsx': 'typescript',");
    expect(module).toContain("'html': 'xml',");
    expect(module).toContain("'xml': 'xml',");
  });

  it('lists every key in the union type', () => {
    for (const key of ['typescript', 'ts', 'tsx', 'xml', 'html', 'svg']) {
      expect(module).toContain(`  | '${key}'`);
    }
  });

  it('sorts keys so the output is stable across runs', () => {
    const keys = [...module.matchAll(/^ {2}\| '([^']+)'/gm)].map((m) => m[1]);
    expect(keys).toEqual([...keys].sort());
  });

  // id first, then aliases — so a collision between two grammars resolves to
  // the grammar that OWNS the id rather than to whichever registered last.
  it('lets a grammar id win over another grammar claiming it as an alias', () => {
    const module = buildHljsLoaderModule([
      { id: 'markdown', aliases: [] },
      { id: 'other', aliases: ['markdown'] },
    ]);
    expect(module).toContain("'markdown': 'markdown',");
    expect(module).not.toContain("'markdown': 'other',");
  });

  it('lets the first claimant win between two aliases of the same name', () => {
    const module = buildHljsLoaderModule([
      { id: 'a', aliases: ['shared'] },
      { id: 'b', aliases: ['shared'] },
    ]);
    expect(module).toContain("'shared': 'a',");
    expect(module).not.toContain("'shared': 'b',");
  });

  it('handles a grammar with no aliases', () => {
    expect(buildHljsLoaderModule([{ id: 'plaintext', aliases: [] }]))
      .toContain("'plaintext': 'plaintext',");
  });

  it('emits only static import specifiers', () => {
    expect(hasOnlyStaticImports(module)).toBe(true);
  });
});

describe('buildFlagLoadersModule', () => {
  const module = buildFlagLoadersModule(['be', 'nl']);

  it('emits one lazy loader per country code', () => {
    expect(module).toContain("'be': () => import('./assets/be.svg?raw').then((m) => m.default),");
    expect(module).toContain("'nl': () => import('./assets/nl.svg?raw').then((m) => m.default),");
  });

  it('lists every code in the CountryCode union', () => {
    expect(module).toContain("  | 'be'");
    expect(module).toContain("  | 'nl'");
  });

  // The WC lib gets the `*.svg?raw` module declaration from `vite/client`; the
  // framework wrapper libs type-check through the path mapping into here and do
  // not, so the reference has to travel with the generated file.
  it('carries the raw-svg module declaration', () => {
    expect(module).toContain('/// <reference path="./raw-svg.d.ts" />');
  });

  it('emits only static import specifiers', () => {
    expect(hasOnlyStaticImports(module)).toBe(true);
  });
});

describe('buildFlagBundleModule', () => {
  const module = buildFlagBundleModule([['be', '<svg id="be"/>']]);

  it('inlines the svg source', () => {
    expect(module).toContain('\'be\': "<svg id=\\"be\\"/>",');
  });

  // Type-only, so this module carries no runtime dependency on the loader map
  // and a bundler can keep the two delivery shapes independent.
  it('imports CountryCode as a type only', () => {
    expect(module).toContain("import type { CountryCode } from './flag-loaders.generated';");
  });

  it('escapes svg content that would otherwise break the module', () => {
    const module = buildFlagBundleModule([['xx', '<svg>`${x}`\n"quoted"</svg>']]);
    expect(() => JSON.parse(module.match(/'xx': (".*"),/)![1])).not.toThrow();
  });
});
