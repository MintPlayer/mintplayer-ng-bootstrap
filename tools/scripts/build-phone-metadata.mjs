#!/usr/bin/env node
/**
 * Codegen for `phone-core/src/metadata/<iso2>.generated.ts` + the loader map.
 *
 * Slices `libphonenumber-js`'s own `metadata.max.json` into one module per
 * country, so a phone input downloads full-precision rules for the *selected*
 * country (~0.3 KB gzip) instead of all 244 countries at once (57 KB gzip). The
 * country is always known before any rule is needed — dial-code detection is the
 * eager `intl-tel-input` table's job — so no caller ever needs more than one.
 *
 * WHY WE SLICE INSTEAD OF USING `libphonenumber-metadata-generator`: measured,
 * the official generator's `--countries CA` emits `country_calling_codes:
 * {"1":["CA"]}` and no `formats`, so CA formats NOTHING — and the same for the
 * 43 other countries that inherit their formats (see below). It also downloads
 * Google's XML over the network at generation time, which would make our build
 * non-reproducible and could drift from the installed `libphonenumber-js`. The
 * installed `metadata.max.json` is a published export subpath of a declared
 * dependency, so slicing it is offline, reproducible and always in step with the
 * code that reads it.
 *
 * THE INHERITANCE TRAP: Google stores the formats for a shared calling code only
 * in its "main" country — NANP formats live in US, +7 in RU, +39's Vatican in IT.
 * `NumberingPlan.formats()` silently falls back to
 * `country_calling_codes[callingCode][0]`, so a slice must carry the main
 * country's entry too, verbatim: dropping only its `types` regexes was measured
 * to break `getType()` for AX/EH/SJ and validity for VA, because those same
 * regexes are what pick a country out of a shared calling code.
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

/** Index of `types` in a minified numbering plan (METADATA.md / NumberingPlan.types()). */
const I_TYPES = 11;

const HEADER = [
  '// AUTO-GENERATED — do not edit by hand.',
  '// Source: node_modules/libphonenumber-js/metadata.max.json',
  '// Regenerate with the codegen-wc Nx target.',
];

function sliceFor(full, iso2) {
  const entry = full.countries[iso2];
  const callingCode = entry[0];
  const main = full.country_calling_codes[callingCode][0];

  const countries = { [iso2]: entry };
  const callingCodeCountries = [iso2];
  if (main !== iso2) {
    // Verbatim, and FIRST in the list: `getNumberingPlanMetadata()` reads index 0
    // to resolve the inherited formats.
    countries[main] = full.countries[main];
    callingCodeCountries.unshift(main);
  }

  return {
    version: full.version,
    country_calling_codes: { [callingCode]: callingCodeCountries },
    countries,
    // `MetadataJson` requires the section and no selectable country has a
    // non-geographic calling code, so an empty one is both correct and free.
    nonGeographic: {},
  };
}

function countryModule(iso2, sliced) {
  return [
    ...HEADER,
    `// Country: ${iso2}${
      Object.keys(sliced.countries).length > 1
        ? ` (+ ${Object.keys(sliced.countries).filter((c) => c !== iso2).join(', ')}, whose formats it inherits)`
        : ''
    }`,
    '',
    "import type { MetadataJson } from 'libphonenumber-js/core';",
    '',
    `const metadata: MetadataJson = ${JSON.stringify(sliced)};`,
    '',
    'export default metadata;',
    '',
  ].join('\n');
}

function loaderModule(codes) {
  return [
    ...HEADER,
    '',
    "import type { MetadataJson } from 'libphonenumber-js/core';",
    '',
    '/** ISO 3166-1 alpha-2 code (lowercase) of every country this package ships rules for. */',
    `export type PhoneMetadataCountry =\n${codes.map((c) => `  | '${c.toLowerCase()}'`).join('\n')};`,
    '',
    '/**',
    ' * One lazy loader per country. Each import is a static literal on purpose — a',
    ' * computed specifier survives into the published `.mjs` and either hard-fails an',
    ' * esbuild consumer or, worse, globs the whole directory into its bundle.',
    ' */',
    'export const metadataLoaders: Record<PhoneMetadataCountry, () => Promise<MetadataJson>> = {',
    ...codes.map(
      (c) => `  '${c.toLowerCase()}': () => import('./metadata/${c.toLowerCase()}.generated').then((m) => m.default),`,
    ),
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

  // '001' is libphonenumber's pseudo-country for non-geographic plans.
  const codes = Object.keys(full.countries)
    .filter((c) => c !== '001')
    .sort();

  await mkdir(metadataDir, { recursive: true });

  let written = 0;
  for (const iso2 of codes) {
    const path = join(metadataDir, `${iso2.toLowerCase()}.generated.ts`);
    if (await writeIfChanged(path, countryModule(iso2, sliceFor(full, iso2)))) written++;
  }

  // A shrinking country list must not leave orphans behind: a stale chunk would
  // still be reachable through its own path even after the map stopped naming it.
  const expected = new Set(codes.map((c) => `${c.toLowerCase()}.generated.ts`));
  const stale = (await readdir(metadataDir)).filter((f) => f.endsWith('.generated.ts') && !expected.has(f));
  await Promise.all(stale.map((f) => unlink(join(metadataDir, f))));

  const mapChanged = await writeIfChanged(loadersPath, loaderModule(codes));

  console.log(
    `build-phone-metadata: ${codes.length} countries — ${written} chunk(s) written, ` +
      `${stale.length} stale removed, map ${mapChanged ? 'written' : 'unchanged'} ` +
      `(${relative(repoRoot, loadersPath).replace(/\\/g, '/')})`,
  );
}

main().catch((err) => {
  console.error(err.stack ?? err);
  process.exit(1);
});
