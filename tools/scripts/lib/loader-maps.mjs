/**
 * The generated static loader maps.
 *
 * CLAUDE.md's rule — every dynamic import() specifier in lib source must be a
 * static string literal — is what these emit and why they exist: a computed
 * specifier survives into the published .mjs and either hard-fails a consumer's
 * esbuild build or, worse and silently, globs a whole directory into their
 * bundle. The emitters are pure string builders, extracted from
 * build-hljs-loaders.mjs / build-flag-loaders.mjs so they can be tested without
 * node_modules/highlight.js or an assets directory.
 */

/** hljs: one loader per language id AND alias, from `{ id, aliases }` entries. */
export function buildHljsLoaderModule(entries) {
  // id first, then aliases — so a key collision between two grammars resolves
  // to the grammar that owns the id rather than to whichever registered last.
  const keys = new Map();
  for (const { id } of entries) keys.set(id, id);
  for (const { id, aliases } of entries) {
    for (const alias of aliases) if (!keys.has(alias)) keys.set(alias, id);
  }

  const sorted = [...keys.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return [
    '// AUTO-GENERATED — do not edit by hand.',
    '// Source: node_modules/highlight.js/lib/common.js (+ each grammar\'s aliases)',
    '// Regenerate with the codegen-wc Nx target.',
    '',
    "import type { LanguageFn } from 'highlight.js';",
    '',
    '/** Every language id and alias `<mp-code-snippet>` can load on demand. */',
    `export type HljsLanguageKey =\n${sorted.map(([k]) => `  | '${k}'`).join('\n')};`,
    '',
    '/**',
    ' * One lazy loader per language id AND alias, so `language="tsx"` and',
    " * `language=\"html\"` resolve rather than falling through to auto-detect.",
    ' * Several keys deliberately share a target (tsx/ts/mts/cts -> typescript).',
    ' *',
    ' * Each import is a static literal on purpose — see',
    ' * tools/scripts/build-hljs-loaders.mjs.',
    ' */',
    'export const hljsLoaders: Record<HljsLanguageKey, () => Promise<LanguageFn>> = {',
    ...sorted.map(
      ([key, id]) =>
        `  '${key}': () => import('highlight.js/lib/languages/${id}').then((m) => m.default),`,
    ),
    '};',
    '',
    '/** Canonical grammar id for a key, so one grammar is registered once. */',
    'export const hljsLanguageIds: Record<HljsLanguageKey, string> = {',
    ...sorted.map(([key, id]) => `  '${key}': '${id}',`),
    '};',
    '',
  ].join('\n');
}

/** flags: one loader per ISO 3166-1 alpha-2 code. */
export function buildFlagLoadersModule(codes) {
  return [
    '// AUTO-GENERATED — do not edit by hand.',
    '// Source: flags/src/assets/*.svg',
    '// Regenerate with the codegen-wc Nx target.',
    '',
    // Carries the `*.svg?raw` module declaration into any program that includes
    // this file. The WC lib gets it from `vite/client`; the framework wrapper
    // libs type-check through the path mapping into here and do not.
    '/// <reference path="./raw-svg.d.ts" />',
    '',
    '/** ISO 3166-1 alpha-2 code (lowercase) of every flag this package ships. */',
    `export type CountryCode =\n${codes.map((c) => `  | '${c}'`).join('\n')};`,
    '',
    '/**',
    ' * One lazy loader per flag. Each import is a static literal on purpose — see',
    ' * tools/scripts/build-flag-loaders.mjs.',
    ' */',
    'export const flagLoaders: Record<CountryCode, () => Promise<string>> = {',
    ...codes.map((c) => `  '${c}': () => import('./assets/${c}.svg?raw').then((m) => m.default),`),
    '};',
    '',
  ].join('\n');
}

/** flags: every flag inlined, reached only through `loadAllFlags()`. */
export function buildFlagBundleModule(entries) {
  return [
    '// AUTO-GENERATED — do not edit by hand.',
    '// Source: flags/src/assets/*.svg',
    '// Regenerate with the codegen-wc Nx target.',
    '',
    // Type-only, so this module carries no runtime dependency on the loader map
    // and a bundler can keep the two delivery shapes independent.
    "import type { CountryCode } from './flag-loaders.generated';",
    '',
    '/**',
    ' * Every flag, inlined. Reached only through `loadAllFlags()`, so this whole',
    ' * module is one lazy chunk — see tools/scripts/build-flag-loaders.mjs.',
    ' */',
    'export const allFlags: Readonly<Record<CountryCode, string>> = {',
    ...entries.map(([c, svg]) => `  '${c}': ${JSON.stringify(svg)},`),
    '};',
    '',
  ].join('\n');
}
