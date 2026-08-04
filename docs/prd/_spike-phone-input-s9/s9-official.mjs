// S9.8 — is the OFFICIAL `libphonenumber-metadata-generator` a better source than
// slicing metadata.max.json? Compares byte-for-byte and behaviourally.
//
// Prereq (network):
//   node node_modules/libphonenumber-metadata-generator/bin/generate-metadata.js \
//     out/gen-<ISO>.json --countries <ISO> --with-phone-number-types
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slice } from './slice.mjs';
import * as maxSet from 'libphonenumber-js/max';
import * as core from 'libphonenumber-js/core';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const full = JSON.parse(readFileSync(join(repoRoot, 'node_modules/libphonenumber-js/metadata.max.json'), 'utf8'));
const examples = JSON.parse(readFileSync(join(repoRoot, 'node_modules/libphonenumber-js/examples.mobile.json'), 'utf8'));

const h = (s) => console.log(`\n${'='.repeat(78)}\n${s}\n${'='.repeat(78)}`);
const row = (...c) => console.log('  ' + c.join('  '));

function stripCallingCode(f, n) {
  let seen = 0;
  let i = 0;
  for (; i < f.length && seen < n; i++) if (/\d/.test(f[i])) seen++;
  while (i < f.length && !/\d/.test(f[i])) i++;
  return f.slice(i);
}

h('S9.8a — official generator output vs metadata.max.json slice, per country');
row('iso'.padEnd(5), 'official B'.padEnd(12), 'slice(withMain) B'.padEnd(19), 'countries in each'.padEnd(34), 'entry identical to max?');
for (const iso of ['BE', 'US', 'CA', 'KZ', 'VA', 'AX']) {
  const p = join(here, `out/gen-${iso}.json`);
  if (!existsSync(p)) {
    row(iso.padEnd(5), '(not generated)');
    continue;
  }
  const official = JSON.parse(readFileSync(p, 'utf8'));
  const mine = slice(full, iso, 'withMain');
  const sameEntry = JSON.stringify(official.countries[iso]) === JSON.stringify(full.countries[iso]);
  row(
    iso.padEnd(5),
    String(readFileSync(p).length).padEnd(12),
    String(JSON.stringify(mine).length).padEnd(19),
    `official ${Object.keys(official.countries).join(',')} | slice ${Object.keys(mine.countries).join(',')}`.padEnd(34),
    sameEntry ? 'yes' : 'NO — see diff below',
  );
  if (!sameEntry) {
    row(`      official: ${JSON.stringify(official.countries[iso])}`);
    row(`      max.json: ${JSON.stringify(full.countries[iso])}`);
  }
}

h('S9.8b — does the OFFICIAL single-country slice format? (the same trap)');
row('iso'.padEnd(5), 'national'.padEnd(13), 'full /max'.padEnd(18), 'official slice'.padEnd(18), 'my slice(withMain)');
for (const iso of ['BE', 'US', 'CA', 'KZ', 'VA', 'AX']) {
  const p = join(here, `out/gen-${iso}.json`);
  if (!existsSync(p)) continue;
  const official = JSON.parse(readFileSync(p, 'utf8'));
  const mine = slice(full, iso, 'withMain');
  const nat = examples[iso];
  const dial = full.countries[iso][0];
  const oracle = stripCallingCode(new maxSet.AsYouType().input(`+${dial}${nat}`), dial.length);
  const off = stripCallingCode(new core.AsYouType(undefined, official).input(`+${dial}${nat}`), dial.length);
  const my = stripCallingCode(new core.AsYouType(undefined, mine).input(`+${dial}${nat}`), dial.length);
  row(
    iso.padEnd(5),
    nat.padEnd(13),
    JSON.stringify(oracle).padEnd(18),
    `${JSON.stringify(off)}${off === oracle ? '' : ' DIFF'}`.padEnd(18),
    `${JSON.stringify(my)}${my === oracle ? '' : ' DIFF'}`,
  );
}

h('S9.8c — version skew: the generator downloads Google metadata, not the installed set');
row(`installed libphonenumber-js: ${JSON.parse(readFileSync(join(repoRoot, 'node_modules/libphonenumber-js/package.json'), 'utf8')).version}`);
row('generator download: Google PhoneNumberMetadata.xml "release 9.0.36" (printed by the CLI run)');
row('');
row('Every country entry compared against the installed metadata.max.json:');
let same = 0;
let diff = 0;
for (const iso of ['BE', 'US', 'CA', 'KZ', 'VA', 'AX']) {
  const p = join(here, `out/gen-${iso}.json`);
  if (!existsSync(p)) continue;
  const official = JSON.parse(readFileSync(p, 'utf8'));
  if (JSON.stringify(official.countries[iso]) === JSON.stringify(full.countries[iso])) same++;
  else {
    diff++;
    row(`  ${iso} DIFFERS between the freshly downloaded XML and the installed metadata.max.json`);
  }
}
row(`  identical: ${same}, differing: ${diff}`);
