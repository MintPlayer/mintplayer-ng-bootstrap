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
 * Side-effect-free on import: the CLI work sits behind an isEntryPoint guard and
 * every path is a defaulted parameter.
 *
 * Usage:
 *   node tools/scripts/build-hljs-loaders.mjs
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { buildHljsLoaderModule } from './lib/loader-maps.mjs';
import { writeIfChanged } from './lib/wc-codegen.mjs';

export const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

/** A `require` rooted at the workspace, so hljs resolves from ITS node_modules. */
export const requireFrom = (repoRoot = REPO_ROOT) =>
  createRequire(pathToFileURL(join(repoRoot, 'package.json')));

export function hljsPaths(repoRoot = REPO_ROOT) {
  return {
    outPath: join(repoRoot, 'libs/mintplayer-web-components/code-snippet/src/hljs-loaders.generated.ts'),
    commonPath: join(repoRoot, 'node_modules/highlight.js/lib/common.js'),
  };
}

/**
 * The grammars `lib/common` registers — the set we make loadable. Pure over the
 * source text, so a spec can hand it a snippet instead of the real file.
 */
export function parseCommonIds(src) {
  const ids = [...src.matchAll(/require\(['"]\.\/languages\/([\w-]+)['"]\)/g)].map((m) => m[1]);
  return [...new Set(ids)].sort();
}

async function readCommonIds(commonPath) {
  return parseCommonIds(await readFile(commonPath, 'utf8'));
}

/**
 * Register every grammar against a real `lib/core` instance and read back its
 * aliases. Registration is the only way to get them: the alias list lives
 * inside the language definition function's return value, and calling that
 * function needs the genuine hljs API object.
 */
export function collectAliases(ids, require = requireFrom()) {
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

export async function main(repoRoot = REPO_ROOT) {
  const { outPath, commonPath } = hljsPaths(repoRoot);

  if (!existsSync(commonPath)) {
    console.error(
      `build-hljs-loaders: ${relative(repoRoot, commonPath)} not found — is highlight.js installed?`,
    );
    process.exit(1);
  }

  const ids = await readCommonIds(commonPath);
  const { entries, failures } = collectAliases(ids, requireFrom(repoRoot));

  // A grammar that fails to register would silently vanish from the map and
  // degrade to auto-detect at runtime, so fail the build instead.
  if (failures.length) {
    console.error(`build-hljs-loaders: ${failures.length} grammar(s) failed to register:`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }

  const aliasCount = entries.reduce((n, e) => n + e.aliases.length, 0);
  const wrote = await writeIfChanged(outPath, buildHljsLoaderModule(entries));

  console.log(
    `build-hljs-loaders: ${entries.length} grammar(s) + ${aliasCount} alias(es) — ` +
      `${wrote ? 'wrote  ' : 'skipped'} ${relative(repoRoot, outPath).replace(/\\/g, '/')}`,
  );
}

const isEntryPoint = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  main().catch((err) => {
    console.error(err.stack ?? err);
    process.exit(1);
  });
}
