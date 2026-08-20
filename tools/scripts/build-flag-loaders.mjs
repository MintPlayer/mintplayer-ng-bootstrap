#!/usr/bin/env node
/**
 * Codegen for the two flag delivery shapes, from the same vendored SVGs.
 *
 * `flags/src/all-flags.generated.ts` — the whole corpus inlined into ONE module
 * (`Record<CountryCode, string>`), fetched as a single lazy chunk. This is what
 * a country picker uses, and the measured reason it exists: 244 separate chunk
 * requests take 3.2 s to land over HTTP/1.1 at 50 ms RTT (1.9 s at 20 ms, 0.44 s
 * over HTTP/2) versus 0.2 s for the one bundle, and cost 90 KB gzip + ~50 KB of
 * response headers against 43 KB. Per-flag compression is also far worse: 244
 * chunks gzip to 90 KB in total, the concatenated corpus to 43 KB.
 *
 * `flags/src/flag-loaders.generated.ts` — one `() => import('./assets/<iso2>.svg?raw')`
 * per flag, for a consumer that needs a handful of flags and not the corpus
 * (~350 B gzip each instead of 43 KB). Kept in its own module so a bundler drops
 * it, and its 244 dynamic imports with it, for anyone who only calls
 * `loadAllFlags()`.
 *
 * Both maps exist so every dynamic import is a **static string literal**: a
 * computed import (`` import(`./assets/${code}.svg?raw`) ``) survives verbatim
 * into the published `.mjs` and hard-fails every esbuild consumer's build.
 * Rollup inlines each SVG's text into the chunk, which is why the `.svg` files
 * never have to be published.
 *
 * Idempotent: skips the write when byte-identical, so the Nx cache stays warm
 * and git stays clean.
 *
 * Usage:
 *   node tools/scripts/build-flag-loaders.mjs
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFlagBundleModule, buildFlagLoadersModule } from './lib/loader-maps.mjs';

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const flagsSrc = join(repoRoot, 'libs/mintplayer-web-components/flags/src');
const assetsDir = join(flagsSrc, 'assets');
const loadersPath = join(flagsSrc, 'flag-loaders.generated.ts');
const bundlePath = join(flagsSrc, 'all-flags.generated.ts');

async function writeIfChanged(path, next) {
  const prev = existsSync(path) ? await readFile(path, 'utf8') : null;
  if (prev !== next) await writeFile(path, next, 'utf8');
  return prev !== next;
}

async function main() {
  if (!existsSync(assetsDir)) {
    console.error(
      `build-flag-loaders: ${relative(repoRoot, assetsDir)} not found — run tools/scripts/refresh-flags.mjs first.`,
    );
    process.exit(1);
  }

  const codes = (await readdir(assetsDir))
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -'.svg'.length))
    .sort();

  if (codes.length === 0) {
    console.error(`build-flag-loaders: no .svg files in ${relative(repoRoot, assetsDir)}.`);
    process.exit(1);
  }

  // Verbatim, NOT trimmed: `?raw` hands the per-flag chunk the file's exact
  // bytes, so trimming here would make the two delivery shapes return different
  // strings for the same flag. `all-flags.spec.ts` asserts they agree.
  const entries = await Promise.all(
    codes.map(async (c) => [c, await readFile(join(assetsDir, `${c}.svg`), 'utf8')]),
  );

  const wroteLoaders = await writeIfChanged(loadersPath, buildFlagLoadersModule(codes));
  const wroteBundle = await writeIfChanged(bundlePath, buildFlagBundleModule(entries));

  const report = (wrote, path) =>
    `${wrote ? 'wrote  ' : 'skipped'} ${relative(repoRoot, path).replace(/\\/g, '/')}`;
  console.log(
    `build-flag-loaders: ${codes.length} flag(s) — ` +
      `${report(wroteLoaders, loadersPath)}, ${report(wroteBundle, bundlePath)}`,
  );
}

main().catch((err) => {
  console.error(err.stack ?? err);
  process.exit(1);
});
