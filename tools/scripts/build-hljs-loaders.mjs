#!/usr/bin/env node
/**
 * Codegen for `<mp-code-snippet>`'s lazy highlight.js grammar loaders.
 *
 * The element used to `import hljs from 'highlight.js/lib/common'` at module
 * top level, which puts 36 grammars — 53.7 KB gzip, measured — in the initial
 * bundle of anyone who imports the component, even though 331 of 332 in-repo
 * usages name exactly one language up front. hljs cannot be tree-shaken here:
 * its own package.json `sideEffects` array lists `./lib/common.js`, pinning
 * every `registerLanguage` call.
 *
 * So: `lib/core` (8.6 KB gzip) plus one lazily-loaded grammar. This module is
 * the id -> loader map that makes that possible with **static string literal**
 * import specifiers. A computed specifier (`` import(`.../${id}`) ``) survives
 * verbatim into the published `.mjs` and then either hard-fails an esbuild
 * consumer's build or silently globs the whole target directory into their
 * bundle — see CLAUDE.md.
 *
 * MANY-TO-ONE, because ids and aliases are not the same set and the aliases
 * are what consumers actually write: the demos use `language="tsx"` 51x and
 * `language="html"` 51x. `tsx` is an alias of typescript and `html` of xml, so
 * an id-only map would silently fall back to auto-detect for 102 usages.
 * Aliases are read by registering each grammar against the REAL lib/core — a
 * mocked hljs API throws `hljs.COMMENT is not a function`.
 *
 * Idempotent: skips the write when byte-identical, so the Nx cache stays warm
 * and git stays clean.
 *
 * Usage:
 *   node tools/scripts/build-hljs-loaders.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const require = createRequire(pathToFileURL(join(repoRoot, 'package.json')));
const outPath = join(
  repoRoot,
  'libs/mintplayer-web-components/code-snippet/src/hljs-loaders.generated.ts',
);
const commonPath = join(repoRoot, 'node_modules/highlight.js/lib/common.js');

/** The grammars `lib/common` registers — the set we make loadable. */
async function readCommonIds() {
  const src = await readFile(commonPath, 'utf8');
  const ids = [...src.matchAll(/require\(['"]\.\/languages\/([\w-]+)['"]\)/g)].map((m) => m[1]);
  return [...new Set(ids)].sort();
}

/**
 * Register every grammar against a real `lib/core` instance and read back its
 * aliases. Registration is the only way to get them: the alias list lives
 * inside the language definition function's return value, and calling that
 * function needs the genuine hljs API object.
 */
function collectAliases(ids) {
  const hljs = require('highlight.js/lib/core');
  const failures = [];
  const entries = [];

  for (const id of ids) {
    try {
      const mod = require(`highlight.js/lib/languages/${id}`);
      hljs.registerLanguage(id, mod.default ?? mod);
      entries.push({ id, aliases: hljs.getLanguage(id)?.aliases ?? [] });
    } catch (err) {
      failures.push(`${id}: ${String(err).split('\n')[0]}`);
    }
  }

  return { entries, failures };
}

function buildModule(entries) {
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

async function writeIfChanged(path, next) {
  const prev = existsSync(path) ? await readFile(path, 'utf8') : null;
  if (prev !== next) await writeFile(path, next, 'utf8');
  return prev !== next;
}

async function main() {
  if (!existsSync(commonPath)) {
    console.error(
      `build-hljs-loaders: ${relative(repoRoot, commonPath)} not found — is highlight.js installed?`,
    );
    process.exit(1);
  }

  const ids = await readCommonIds();
  const { entries, failures } = collectAliases(ids);

  // A grammar that fails to register would silently vanish from the map and
  // degrade to auto-detect at runtime, so fail the build instead.
  if (failures.length) {
    console.error(`build-hljs-loaders: ${failures.length} grammar(s) failed to register:`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }

  const aliasCount = entries.reduce((n, e) => n + e.aliases.length, 0);
  const wrote = await writeIfChanged(outPath, buildModule(entries));

  console.log(
    `build-hljs-loaders: ${entries.length} grammar(s) + ${aliasCount} alias(es) — ` +
      `${wrote ? 'wrote  ' : 'skipped'} ${relative(repoRoot, outPath).replace(/\\/g, '/')}`,
  );
}

main().catch((err) => {
  console.error(err.stack ?? err);
  process.exit(1);
});
