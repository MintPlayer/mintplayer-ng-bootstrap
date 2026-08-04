// S4.1/S4.2 — Node side. Writes the Node baseline of localized region names for
// every dial-code country × the six PRD locales, plus the runtime-default-locale
// evidence. `s4-parity.spec.ts` re-computes the same table in each browser
// engine and diffs against this file.
//
//   node docs/prd/_spike-phone-input-s478/s4-icu-parity.mjs
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ISO_CODES, LOCALES, AWKWARD, namesFor } from './iso-codes.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const baseline = {
  engine: `node ${process.version}`,
  icu: process.versions.icu,
  // S4.2 — what `new Intl.DisplayNames(undefined, …)` resolves to on this host.
  defaultLocale: new Intl.DisplayNames(undefined, { type: 'region' }).resolvedOptions().locale,
  intlDefault: Intl.DateTimeFormat().resolvedOptions().locale,
  envLocaleVars: {
    LANG: process.env.LANG ?? null,
    LC_ALL: process.env.LC_ALL ?? null,
  },
  count: ISO_CODES.length,
  names: Object.fromEntries(LOCALES.map((l) => [l, namesFor(l)])),
  namesDefaultLocale: namesFor(undefined),
  awkward: Object.fromEntries(
    LOCALES.map((l) => [l, namesFor(l, AWKWARD)]),
  ),
};

await writeFile(resolve(here, 's4-node-names.json'), JSON.stringify(baseline, null, 1), 'utf8');

console.log(`node ${process.version}  ICU ${process.versions.icu}`);
console.log(`default region-display locale: ${baseline.defaultLocale}  (DateTimeFormat: ${baseline.intlDefault})`);
console.log(`LANG=${baseline.envLocaleVars.LANG} LC_ALL=${baseline.envLocaleVars.LC_ALL}`);
console.log(`wrote ${ISO_CODES.length} codes × ${LOCALES.length} locales`);

// Unresolved = DisplayNames fell back to the code itself (fallback: 'code').
for (const l of LOCALES) {
  const unresolved = ISO_CODES.filter((c) => baseline.names[l][c] === c.toUpperCase());
  console.log(`  ${l}: ${unresolved.length} unresolved${unresolved.length ? ' → ' + unresolved.join(',') : ''}`);
}
console.log('awkward codes, en-US:', JSON.stringify(baseline.awkward['en-US']));
console.log('awkward codes, nl-BE:', JSON.stringify(baseline.awkward['nl-BE']));
