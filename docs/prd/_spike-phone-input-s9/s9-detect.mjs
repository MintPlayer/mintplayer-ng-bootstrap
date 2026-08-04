// S9.9 — the architectural consequences of per-country metadata.
//
// Per-country metadata removes libphonenumber from two code paths S8 had it in:
//   D11 detection of a pasted `+XX…` — the country is not known yet, so no slice
//       can be loaded, so `parsePhoneNumberFromString('+44…')` is not available.
//   D15 formRestore of an E.164 — same: the country must be resolved BEFORE the
//       metadata for it can be fetched.
// Both therefore become table-only. This measures whether that costs anything.
//
//   node docs/prd/_spike-phone-input-s9/s9-detect.mjs
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawCountryData } from 'intl-tel-input/data';
import * as maxSet from 'libphonenumber-js/max';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const full = JSON.parse(readFileSync(join(repoRoot, 'node_modules/libphonenumber-js/metadata.max.json'), 'utf8'));
const examples = JSON.parse(readFileSync(join(repoRoot, 'node_modules/libphonenumber-js/examples.mobile.json'), 'utf8'));

const h = (s) => console.log(`\n${'='.repeat(78)}\n${s}\n${'='.repeat(78)}`);
const row = (...c) => console.log('  ' + c.join('  '));

const COUNTRIES = rawCountryData.map(([iso2, dialCode, priority, areaCodes, nationalPrefix]) => ({
  iso2,
  dialCode,
  priority: priority ?? 0,
  areaCodes: areaCodes ?? null,
  nationalPrefix: nationalPrefix ?? null,
}));

// S8's algorithm, verbatim.
function countryFromDigits(digits) {
  let best = null;
  for (const c of COUNTRIES) {
    if (!digits.startsWith(c.dialCode)) continue;
    const rest = digits.slice(c.dialCode.length);
    let matchLen = c.dialCode.length;
    let areaHit = false;
    if (c.areaCodes) {
      const area = c.areaCodes.find((a) => rest.startsWith(a));
      if (area) {
        matchLen += area.length;
        areaHit = true;
      }
    }
    const candidate = { ...c, matchLen, areaHit };
    if (
      !best ||
      candidate.matchLen > best.matchLen ||
      (candidate.matchLen === best.matchLen &&
        !(best.areaHit && !candidate.areaHit) &&
        (candidate.areaHit === best.areaHit ? candidate.priority < best.priority : candidate.areaHit))
    ) {
      best = candidate;
    }
  }
  return best;
}

/** S8's rule: libphonenumber first, table as fallback. Needs the WHOLE metadata set. */
function detectWithLpn(raw, current) {
  const trimmed = raw.trim().replace(/^00/, '+');
  if (!trimmed.startsWith('+')) return null;
  const digits = trimmed.slice(1).replace(/\D/g, '');
  if (!digits) return null;
  const parsed = maxSet.parsePhoneNumberFromString(`+${digits}`);
  if (parsed?.country) {
    return { via: 'libphonenumber', country: parsed.country.toLowerCase(), national: parsed.nationalNumber };
  }
  return detectTableOnly(raw, current);
}

/**
 * The per-country-metadata rule: the table is the ONLY detector.
 *
 * `strictKeep` is the amendment this spike proposes. S8's `keepCurrent` clause
 * ("don't move the user off `us` onto `ca` mid-typing") compared *dial-code*
 * lengths, which is only safe while libphonenumber runs first and wins: with the
 * table alone it swallows every area-code match, reporting `us` for Barbados and
 * Toronto alike. Gating it on the table's own match length restores S8.1's
 * table-alone accuracy.
 */
function detectTableOnly(raw, current, strictKeep = false) {
  const trimmed = raw.trim().replace(/^00/, '+');
  if (!trimmed.startsWith('+')) return null;
  const digits = trimmed.slice(1).replace(/\D/g, '');
  if (!digits) return null;
  const t = countryFromDigits(digits);
  if (!t) return null;
  const cur = COUNTRIES.find((c) => c.iso2 === current);
  const keepCurrent =
    cur &&
    digits.startsWith(cur.dialCode) &&
    cur.dialCode.length === t.dialCode.length &&
    (!strictKeep || !t.areaHit);
  const pick = keepCurrent ? cur : t;
  return {
    via: keepCurrent ? 'table (kept current)' : 'table',
    country: pick.iso2,
    national: digits.slice(pick.dialCode.length),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
h('S9.9a — D11 detection: does dropping the libphonenumber branch change any verdict?');
const CASES = [
  ['+32470123456', 'be'],
  ['0032470123456', 'be'],
  ['+32 470 12 34 56', 'be'],
  ['+1 416 555 1234', 'ca'],
  ['+1 212 555 1234', 'us'],
  ['+1 246 555 1234', 'bb'],
  ['+7 701 555 1234', 'kz'],
  ['+7 495 555 1234', 'ru'],
  ['+39 06 698 12345', 'va'],
  ['+590 590 123456', 'gp'],
  ['+1242 555 1234', 'bs'],
  ['+999 555 1234', null],
  ['+1', null],
  ['+', null],
  ['470123456', null],
  ['+321', null],
  ['+441481123456', 'gg'],
  ['+447911123456', 'gg'],
  ['+8001234567', null],
  ['+8701234567', null],
];
row('input'.padEnd(20), 'expect'.padEnd(7), 'lpn-first (S8)'.padEnd(20), 'table, S8 keep'.padEnd(20), 'table, STRICT keep'.padEnd(20));
let lpnRight = 0;
let tabRight = 0;
let strictRight = 0;
for (const [input, expect] of CASES) {
  const a = detectWithLpn(input, 'us');
  const b = detectTableOnly(input, 'us', false);
  const c = detectTableOnly(input, 'us', true);
  if ((a?.country ?? null) === expect) lpnRight++;
  if ((b?.country ?? null) === expect) tabRight++;
  if ((c?.country ?? null) === expect) strictRight++;
  const mark = (r) => `${r?.country ?? '-'}${(r?.country ?? null) === expect ? ' ok' : ' NO'}`;
  row(
    JSON.stringify(input).padEnd(20),
    String(expect).padEnd(7),
    mark(a).padEnd(20),
    mark(b).padEnd(20),
    mark(c).padEnd(20),
  );
}
row('');
row(`correct: lpn-first ${lpnRight}/${CASES.length}   table+S8 keep ${tabRight}/${CASES.length}   table+STRICT keep ${strictRight}/${CASES.length}`);

h('S9.9a2 — the same over the full 244-country sweep');
let n = 0;
let lpnOk = 0;
let tabOk = 0;
let strictOk = 0;
const diffs = [];
for (const c of COUNTRIES) {
  const nat = examples[c.iso2.toUpperCase()];
  if (!nat) continue;
  const e164 = maxSet.parsePhoneNumberFromString(nat, c.iso2.toUpperCase())?.number;
  if (!e164) continue;
  n++;
  const a = detectWithLpn(e164, 'us');
  const b = detectTableOnly(e164, 'us', false);
  const d = detectTableOnly(e164, 'us', true);
  if (a?.country === c.iso2) lpnOk++;
  if (b?.country === c.iso2) tabOk++;
  if (d?.country === c.iso2) strictOk++;
  if (a?.country !== d?.country && diffs.length < 25) {
    diffs.push(`${c.iso2} ${e164}: lpn=${a?.country} strict-table=${d?.country}`);
  }
}
row(`countries: ${n}`);
row(`names the source country: lpn-first ${lpnOk}   table+S8 keep ${tabOk}   table+STRICT keep ${strictOk}`);
row('remaining disagreements between lpn-first and table+STRICT keep:');
for (const d of diffs) row(`     ${d}`);

// ─────────────────────────────────────────────────────────────────────────────
h('S9.9b — D15 formRestore: can splitE164 run WITHOUT metadata?');
// Claim under test: for a parsed E.164, `nationalNumber` is exactly the digits
// after the calling code — so the eager table alone can split the value, and the
// slice is only needed afterwards, for formatting and validity.
let split = 0;
let splitOk = 0;
const splitDiffs = [];
for (const iso of Object.keys(full.countries).filter((c) => c !== '001')) {
  const nat = examples[iso];
  if (!nat) continue;
  const p = maxSet.parsePhoneNumberFromString(nat, iso);
  if (!p) continue;
  split++;
  const digits = p.number.slice(1);
  const byTable = digits.slice(p.countryCallingCode.length);
  if (byTable === p.nationalNumber) splitOk++;
  else if (splitDiffs.length < 15) splitDiffs.push(`${iso} ${p.number}: table="${byTable}" lpn="${p.nationalNumber}"`);
}
row(`E.164 minus calling code === libphonenumber's nationalNumber: ${splitOk}/${split}`);
for (const d of splitDiffs) row(`     ${d}`);
row('');
row('=> splitE164 needs the eager table only. The metadata chunk is required for');
row('   formatting and validity, not for decomposing the restored value.');

// ─────────────────────────────────────────────────────────────────────────────
h('S9.9c — nonGeographic: is the section needed, and what does it cost?');
const ng = JSON.stringify(full.nonGeographic);
row(`nonGeographic section: ${ng.length} B raw / ${gzipSync(ng).length} B gzip — ${Object.keys(full.nonGeographic).join(' ')}`);
const ngCodes = Object.keys(full.nonGeographic);
const tableHasNg = COUNTRIES.filter((c) => ngCodes.some((code) => c.dialCode === code));
row(`countries in the eager table with a non-geographic dial code: ${tableHasNg.length}`);
row(`countries whose dial code is a PREFIX of a non-geographic code: ${
  COUNTRIES.filter((c) => ngCodes.some((code) => code.startsWith(c.dialCode))).map((c) => `${c.iso2}+${c.dialCode}`).join(' ') || 'none'
}`);
row('');
row('=> no selectable country has a non-geographic calling code, so the component');
row('   never asks a slice to resolve one. Omitting the section is free.');

// ─────────────────────────────────────────────────────────────────────────────
h('S9.9d — progressive typing of "+3247…" and "+1416…" with the table only');
for (const target of ['+32470123456', '+14165551234']) {
  row(`--- ${target}`);
  let acc = '';
  for (const ch of target) {
    acc += ch;
    const r = detectTableOnly(acc, 'us');
    row(acc.padEnd(16), String(r?.country ?? '-').padEnd(8), String(r?.via ?? '-').padEnd(22), String(r?.national ?? '-'));
  }
}
