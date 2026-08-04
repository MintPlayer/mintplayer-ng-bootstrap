#!/usr/bin/env node
/**
 * Codegen for `flags/src/flag-loaders.generated.ts`.
 *
 * Emits one `() => import('./assets/<iso2>.svg?raw')` per vendored flag. The
 * map exists so every dynamic import is a **static string literal**: a computed
 * import (`` import(`./assets/${code}.svg?raw`) ``) survives verbatim into the
 * published `.mjs` and hard-fails every esbuild consumer's build. Rollup turns
 * each literal import into its own lazy chunk with the SVG text inlined, which
 * is also why the `.svg` files never have to be published.
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

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const flagsSrc = join(repoRoot, 'libs/mintplayer-web-components/flags/src');
const assetsDir = join(flagsSrc, 'assets');
const outPath = join(flagsSrc, 'flag-loaders.generated.ts');

function buildModule(codes) {
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

  const next = buildModule(codes);
  const prev = existsSync(outPath) ? await readFile(outPath, 'utf8') : null;
  if (prev !== next) await writeFile(outPath, next, 'utf8');

  console.log(
    `build-flag-loaders: ${codes.length} flag(s) — ` +
      `${prev === next ? 'skipped ' : 'wrote   '} ${relative(repoRoot, outPath).replace(/\\/g, '/')}`,
  );
}

main().catch((err) => {
  console.error(err.stack ?? err);
  process.exit(1);
});
