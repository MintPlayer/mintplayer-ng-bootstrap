#!/usr/bin/env node
/**
 * Codegen for `phone-core/src/metadata/cc-<callingCode>.generated.ts` + the
 * per-country loader map that points at them.
 *
 * Slices `libphonenumber-js`'s own `metadata.max.json` into one module per
 * *calling code*, so a phone input downloads full-precision rules for the block
 * the selected country belongs to (~0.3 KB gzip for most, 2.9 KB for the +1 NANP
 * block) instead of all 244 countries at once (57 KB gzip). The country is always
 * known before any rule is needed — resolving a `+XX` prefix is the eager
 * `intl-tel-input` table's job — so no caller ever needs more than one block.
 *
 * WHY THE CALLING CODE AND NOT THE COUNTRY is the slice unit: a number typed
 * under one country of a shared block is frequently a *sibling's* number, and
 * libphonenumber validates it against every country of the block. Measured on all
 * 12 shared calling codes, a per-country slice rejected 586 of 640 sibling
 * numbers that the full set accepts — including "United States selected, Canadian
 * number typed", which is mainstream, not an edge case. Slicing by calling code
 * also comes out SMALLER in total (206 chunks / 77 KB gzip vs 245 / 96 KB) and
 * makes a US↔CA switch cost zero extra bytes.
 *
 * A second reason the block is indivisible: Google stores the formats for a
 * shared calling code only in its "main" country — NANP formats live in US, +7's
 * in RU, +39's Vatican in IT — and `NumberingPlan.formats()` silently falls back
 * to `country_calling_codes[callingCode][0]`. A CA-only slice formats NOTHING.
 *
 * WHY WE SLICE INSTEAD OF USING `libphonenumber-metadata-generator`: measured,
 * the official generator's `--countries CA` emits `country_calling_codes:
 * {"1":["CA"]}` and no `formats`, so it walks straight into that trap and cannot
 * be told not to. It also downloads Google's XML over the network at generation
 * time, which would make our build non-reproducible and could drift from the
 * installed `libphonenumber-js`. The installed `metadata.max.json` is a published
 * export subpath of a declared dependency, so slicing it is offline, reproducible
 * and always in step with the code that reads it.
 *
 * Idempotent: skips byte-identical writes so the Nx cache stays warm.
 *
 * Usage:
 *   node tools/scripts/build-phone-metadata.mjs
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const coreSrc = join(repoRoot, 'libs/mintplayer-web-components/phone-core/src');
const metadataDir = join(coreSrc, 'metadata');
const loadersPath = join(coreSrc, 'metadata-loaders.generated.ts');

/**
 * The metadata format version this slicer understands. libphonenumber-js's own
 * `Metadata` class branches on it, and a bump would change the positional index
 * of every field we reason about — so fail the build loudly rather than emit
 * plausible-looking chunks that validate the wrong digits.
 */
const SUPPORTED_FORMAT_VERSION = 4;

const HEADER = [
  '// AUTO-GENERATED — do not edit by hand.',
  '// Source: node_modules/libphonenumber-js/metadata.max.json',
  '// Regenerate with the codegen-wc Nx target.',
];

/** Every country sharing `callingCode`, in the full table's order (index 0 is the "main" one). */
function sliceFor(full, callingCode) {
  const members = full.country_calling_codes[callingCode];
  return {
    version: full.version,
    country_calling_codes: { [callingCode]: [...members] },
    countries: Object.fromEntries(members.map((iso2) => [iso2, full.countries[iso2]])),
    // `MetadataJson` requires the section, and no selectable country has a
    // non-geographic calling code, so an empty one is both correct and free.
    nonGeographic: {},
  };
}

/** `cc-1`, `cc-32`, … — a filename-safe, stable module name per calling code. */
const chunkName = (callingCode) => `cc-${callingCode}`;

function blockModule(callingCode, sliced) {
  return [
    ...HEADER,
    `// Calling code +${callingCode}: ${Object.keys(sliced.countries).join(', ')}`,
    '',
    "import type { MetadataJson } from 'libphonenumber-js/core';",
    '',
    `const metadata: MetadataJson = ${JSON.stringify(sliced)};`,
    '',
    'export default metadata;',
    '',
  ].join('\n');
}

function loaderModule(countryToCallingCode) {
  const codes = Object.keys(countryToCallingCode).sort();
  return [
    ...HEADER,
    '',
    "import type { MetadataJson } from 'libphonenumber-js/core';",
    '',
    '/** ISO 3166-1 alpha-2 code (lowercase) of every country this package ships rules for. */',
    `export type PhoneMetadataCountry =\n${codes.map((c) => `  | '${c}'`).join('\n')};`,
    '',
    '/**',
    ' * One lazy loader per country, several countries sharing one chunk when they',
    ' * share a calling code. Each import is a static literal on purpose — a computed',
    ' * specifier survives into the published `.mjs` and either hard-fails an esbuild',
    ' * consumer or, worse, globs the whole directory into its bundle.',
    ' *',
    ' * The loaders resolve to the module, not to `.default`: unwrapping here would',
    ' * repeat the same closure once per country for no benefit.',
    ' */',
    'export const metadataLoaders: Record<PhoneMetadataCountry, () => Promise<{ default: MetadataJson }>> = {',
    ...codes.map((c) => `  '${c}': () => import('./metadata/${chunkName(countryToCallingCode[c])}.generated'),`),
    '};',
    '',
  ].join('\n');
}

/** Write only when the content changed, so Nx's cache and git stay quiet. */
async function writeIfChanged(path, next) {
  const prev = existsSync(path) ? await readFile(path, 'utf8') : null;
  if (prev === next) return false;
  await writeFile(path, next, 'utf8');
  return true;
}

async function main() {
  const fullPath = require.resolve('libphonenumber-js/metadata.max.json');
  const full = JSON.parse(await readFile(fullPath, 'utf8'));

  if (full.version !== SUPPORTED_FORMAT_VERSION) {
    console.error(
      `build-phone-metadata: metadata.max.json is format version ${full.version}, this slicer ` +
        `understands ${SUPPORTED_FORMAT_VERSION}. The positional field layout may have changed — ` +
        `re-read METADATA.md and source/metadata.js before bumping SUPPORTED_FORMAT_VERSION.`,
    );
    process.exit(1);
  }

  // '001' is libphonenumber's pseudo-country for non-geographic plans, which no
  // selectable country uses.
  const countryToCallingCode = Object.fromEntries(
    Object.keys(full.countries)
      .filter((iso2) => iso2 !== '001')
      .map((iso2) => [iso2.toLowerCase(), full.countries[iso2][0]]),
  );
  const callingCodes = [...new Set(Object.values(countryToCallingCode))];

  await mkdir(metadataDir, { recursive: true });

  let written = 0;
  for (const callingCode of callingCodes) {
    const path = join(metadataDir, `${chunkName(callingCode)}.generated.ts`);
    if (await writeIfChanged(path, blockModule(callingCode, sliceFor(full, callingCode)))) written++;
  }

  // A shrinking country list must not leave orphans behind: a stale chunk would
  // still be reachable through its own path even after the map stopped naming it.
  const expected = new Set(callingCodes.map((cc) => `${chunkName(cc)}.generated.ts`));
  const stale = (await readdir(metadataDir)).filter((f) => f.endsWith('.generated.ts') && !expected.has(f));
  await Promise.all(stale.map((f) => unlink(join(metadataDir, f))));

  const mapChanged = await writeIfChanged(loadersPath, loaderModule(countryToCallingCode));

  console.log(
    `build-phone-metadata: ${Object.keys(countryToCallingCode).length} countries in ` +
      `${callingCodes.length} calling-code chunks — ${written} written, ${stale.length} stale removed, ` +
      `map ${mapChanged ? 'written' : 'unchanged'} ` +
      `(${relative(repoRoot, loadersPath).replace(/\\/g, '/')})`,
  );
}

main().catch((err) => {
  console.error(err.stack ?? err);
  process.exit(1);
});
