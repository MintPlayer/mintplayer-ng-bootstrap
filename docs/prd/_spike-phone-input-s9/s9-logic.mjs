// S9.7 — functional equivalence: does single-country metadata behave exactly like
// full `/max`? This is the pass/fail of the spike.
//
//   node docs/prd/_spike-phone-input-s9/s9-logic.mjs
//
// Methodology copied from docs/prd/_spike-phone-input-s478/s8-logic.mjs: the
// 244-country sweep over libphonenumber's own example numbers, plus the hard
// cases S8 found. `/max` is the oracle; the slice is the candidate.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slice, mainCountryFor, hasOwnFormats } from './slice.mjs';

import * as maxSet from 'libphonenumber-js/max';
import * as core from 'libphonenumber-js/core';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const lpn = join(repoRoot, 'node_modules/libphonenumber-js');

const full = JSON.parse(readFileSync(join(lpn, 'metadata.max.json'), 'utf8'));
const examples = JSON.parse(readFileSync(join(lpn, 'examples.mobile.json'), 'utf8'));

const h = (s) => console.log(`\n${'='.repeat(78)}\n${s}\n${'='.repeat(78)}`);
const row = (...c) => console.log('  ' + c.join('  '));

const ALL = Object.keys(full.countries).filter((c) => c !== '001');
const STRATEGIES = ['country', 'withFormats', 'withMain'];

// Slices are built once per (country, strategy) — the same caching the runtime does.
const cache = new Map();
const sliceOf = (iso, strategy) => {
  const key = `${iso}|${strategy}`;
  if (!cache.has(key)) cache.set(key, slice(full, iso, strategy));
  return cache.get(key);
};

// ─────────────────────────────────────────────────────────────────────────────
// The PRD's F1 formatter (D6b), in both flavours.
// ─────────────────────────────────────────────────────────────────────────────
function stripCallingCode(formatted, ccDigits) {
  let seen = 0;
  let i = 0;
  for (; i < formatted.length && seen < ccDigits; i++) if (/\d/.test(formatted[i])) seen++;
  while (i < formatted.length && !/\d/.test(formatted[i])) i++;
  return formatted.slice(i);
}
/** Oracle: full `/max`, no default country, international route. */
const fmtFull = (dial, nat) =>
  nat ? stripCallingCode(new maxSet.AsYouType().input(`+${dial}${nat}`), dial.length) : '';
/** Candidate: `/core` + a single-country slice. */
const fmtSlice = (dial, nat, md) =>
  nat ? stripCallingCode(new core.AsYouType(undefined, md).input(`+${dial}${nat}`), dial.length) : '';

// ─────────────────────────────────────────────────────────────────────────────
h('S9.7a — /core signature check against the installed version');
row(`libphonenumber-js ${JSON.parse(readFileSync(join(lpn, 'package.json'), 'utf8')).version}`);
row(`metadata.max.json version field: ${full.version} (format version, not a semver)`);
const beMd = sliceOf('BE', 'withFormats');
row(`parsePhoneNumberFromString('470123456', 'BE', md).number = ${core.parsePhoneNumberFromString('470123456', 'BE', beMd)?.number}`);
row(`parsePhoneNumberFromString('+32470123456', md).number   = ${core.parsePhoneNumberFromString('+32470123456', beMd)?.number}`);
row(`isValidPhoneNumber('470123456', 'BE', md)               = ${core.isValidPhoneNumber('470123456', 'BE', beMd)}`);
row(`isValidPhoneNumber('+32470123456', md)                  = ${core.isValidPhoneNumber('+32470123456', beMd)}`);
row(`validatePhoneNumberLength('47012345', 'BE', md)         = ${core.validatePhoneNumberLength('47012345', 'BE', beMd)}`);
row(`new AsYouType('BE', md).input('0470123456')             = ${JSON.stringify(new core.AsYouType('BE', beMd).input('0470123456'))}`);
row(`new AsYouType(undefined, md).input('+32470123456')      = ${JSON.stringify(new core.AsYouType(undefined, beMd).input('+32470123456'))}`);
row(`getType()                                               = ${core.parsePhoneNumberFromString('470123456', 'BE', beMd)?.getType()}`);

// Does an unknown country throw, or silently misbehave?
try {
  core.parsePhoneNumberFromString('612345678', 'NL', beMd);
  row('parse with a country NOT in the slice: no throw');
} catch (e) {
  row(`parse with a country NOT in the slice THROWS: ${e.message}`);
}
try {
  row(`isValidPhoneNumber('+31612345678', beMd) [other country's E.164] = ${core.isValidPhoneNumber('+31612345678', beMd)}`);
} catch (e) {
  row(`isValidPhoneNumber for another country THROWS: ${e.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
h('S9.7b — the format-inheritance trap: AsYouType on the 44 inheriting countries');
row('iso2'.padEnd(6), 'dial'.padEnd(6), 'full /max'.padEnd(22), ...STRATEGIES.map((s) => s.padEnd(22)));
const trapVictims = { country: [], withFormats: [], withMain: [] };
for (const iso of ALL.filter((c) => !hasOwnFormats(full, c))) {
  const nat = examples[iso];
  if (!nat) continue;
  const dial = full.countries[iso][0];
  const oracle = fmtFull(dial, nat);
  const got = STRATEGIES.map((s) => fmtSlice(dial, nat, sliceOf(iso, s)));
  STRATEGIES.forEach((s, i) => {
    if (got[i] !== oracle) trapVictims[s].push(`${iso}: max="${oracle}" ${s}="${got[i]}"`);
  });
  row(
    iso.padEnd(6),
    `+${dial}`.padEnd(6),
    JSON.stringify(oracle).padEnd(22),
    ...got.map((g, i) => `${JSON.stringify(g)}${g === oracle ? '' : ' DIFF'}`.padEnd(22)),
  );
}
row('');
for (const s of STRATEGIES) row(`${s.padEnd(12)} diverges on ${trapVictims[s].length} of the inheriting countries`);

// ─────────────────────────────────────────────────────────────────────────────
h('S9.7c — AsYouType parity, all 244 countries, PROGRESSIVE (every prefix length)');
// Formatting must match at every keystroke, not only on the complete number:
// a mid-typing divergence is exactly what a user would see.
for (const strategy of STRATEGIES) {
  let steps = 0;
  let same = 0;
  const diffs = [];
  for (const iso of ALL) {
    const nat = examples[iso];
    if (!nat) continue;
    const dial = full.countries[iso][0];
    const md = sliceOf(iso, strategy);
    const digits = nat.replace(/\D/g, '');
    for (let n = 1; n <= digits.length; n++) {
      const part = digits.slice(0, n);
      steps++;
      const a = fmtFull(dial, part);
      const b = fmtSlice(dial, part, md);
      if (a === b) same++;
      else if (diffs.length < 20) diffs.push(`${iso} "${part}": max="${a}" slice="${b}"`);
    }
  }
  row(`${strategy.padEnd(12)} ${same}/${steps} keystrokes identical  (${steps - same} differ)`);
  for (const d of diffs) row(`     ${d}`);
}

// ─────────────────────────────────────────────────────────────────────────────
h('S9.7d — isValidPhoneNumber parity: valid / one short / one long, all countries');
for (const strategy of STRATEGIES) {
  let n = 0;
  let agree = 0;
  const diffs = [];
  for (const iso of ALL) {
    const nat = examples[iso];
    if (!nat) continue;
    const e164 = maxSet.parsePhoneNumberFromString(nat, iso)?.number;
    if (!e164) continue;
    const md = sliceOf(iso, strategy);
    for (const [label, num] of [
      ['valid', e164],
      ['1 short', e164.slice(0, -1)],
      ['1 long', e164 + '7'],
    ]) {
      n++;
      const a = maxSet.isValidPhoneNumber(num);
      const b = core.isValidPhoneNumber(num, md);
      if (a === b) agree++;
      else if (diffs.length < 25) diffs.push(`${iso} ${label} ${num}: max=${a} slice=${b}`);
    }
    // Same three, but through the country-scoped call the component actually makes.
    const natDigits = maxSet.parsePhoneNumberFromString(e164)?.nationalNumber ?? '';
    for (const [label, num] of [
      ['valid/nat', natDigits],
      ['1 short/nat', natDigits.slice(0, -1)],
      ['1 long/nat', natDigits + '7'],
    ]) {
      if (!num) continue;
      n++;
      const a = maxSet.isValidPhoneNumber(num, iso);
      const b = core.isValidPhoneNumber(num, iso, md);
      if (a === b) agree++;
      else if (diffs.length < 25) diffs.push(`${iso} ${label} ${num}: max=${a} slice=${b}`);
    }
  }
  row(`${strategy.padEnd(12)} ${agree}/${n} verdicts identical  (${n - agree} differ)`);
  for (const d of diffs) row(`     ${d}`);
}

// ─────────────────────────────────────────────────────────────────────────────
h('S9.7e — validatePhoneNumberLength parity (the as-you-type guard rail, D10 rule 7)');
for (const strategy of STRATEGIES) {
  let n = 0;
  let agree = 0;
  const diffs = [];
  for (const iso of ALL) {
    const nat = examples[iso];
    if (!nat) continue;
    const digits = nat.replace(/\D/g, '');
    const md = sliceOf(iso, strategy);
    // Every prefix plus two over-long variants: the guard rail is consulted on
    // every keystroke, so parity must hold on every keystroke.
    for (let k = 1; k <= digits.length + 2; k++) {
      const part = (digits + '77').slice(0, k);
      n++;
      const a = maxSet.validatePhoneNumberLength(part, iso) ?? 'OK';
      const b = core.validatePhoneNumberLength(part, iso, md) ?? 'OK';
      if (a === b) agree++;
      else if (diffs.length < 20) diffs.push(`${iso} "${part}": max=${a} slice=${b}`);
    }
  }
  row(`${strategy.padEnd(12)} ${agree}/${n} verdicts identical  (${n - agree} differ)`);
  for (const d of diffs) row(`     ${d}`);
}

// ─────────────────────────────────────────────────────────────────────────────
h('S9.7f — getType() parity (the user\'s "home or mobile" case)');
for (const strategy of STRATEGIES) {
  let n = 0;
  let agree = 0;
  const diffs = [];
  for (const iso of ALL) {
    const nat = examples[iso];
    if (!nat) continue;
    const md = sliceOf(iso, strategy);
    n++;
    const a = maxSet.parsePhoneNumberFromString(nat, iso)?.getType() ?? 'undefined';
    const b = core.parsePhoneNumberFromString(nat, iso, md)?.getType() ?? 'undefined';
    if (a === b) agree++;
    else if (diffs.length < 25) diffs.push(`${iso} ${nat}: max=${a} slice=${b}`);
  }
  row(`${strategy.padEnd(12)} ${agree}/${n} types identical  (${n - agree} differ)`);
  for (const d of diffs) row(`     ${d}`);
}

h('S9.7f2 — getType() on LANDLINE numbers too (examples.mobile.json only has mobiles)');
// Build a landline probe set out of each country's own `fixed_line` example
// pattern where metadata carries one; fall back to the S8 hard-case list.
const LANDLINES = [
  ['BE', '23456789', 'Brussels landline'],
  ['IT', '0212345678', 'Milan landline (significant leading 0)'],
  ['GB', '2012345678', 'London landline'],
  ['DE', '8912345', 'Munich landline'],
  ['NL', '101234567', 'Rotterdam landline'],
  ['FR', '123456789', 'Paris landline'],
  ['US', '2125551234', 'NANP — fixed_line_or_mobile'],
  ['CA', '4165551234', 'NANP — fixed_line_or_mobile'],
  ['RU', '4955551234', 'Moscow landline'],
  ['KZ', '7122345678', 'Kazakhstan landline'],
  ['JP', '312345678', 'Tokyo landline'],
  ['CN', '1012345678', 'Beijing landline'],
  ['IN', '1123456789', 'Delhi landline'],
  ['BR', '1123456789', 'São Paulo landline'],
  ['AU', '212345678', 'Sydney landline'],
  ['SA', '112345678', 'Riyadh landline'],
  ['RU', '8001234567', 'RU toll-free (starts with the trunk prefix 8)'],
  ['BE', '70201234', 'BE premium/shared-cost'],
];
row('iso'.padEnd(5), 'national'.padEnd(13), 'max'.padEnd(24), ...STRATEGIES.map((s) => s.padEnd(24)), 'note');
let lm = 0;
let lok = 0;
for (const [iso, nat, note] of LANDLINES) {
  const a = maxSet.parsePhoneNumberFromString(nat, iso)?.getType() ?? 'undefined';
  const got = STRATEGIES.map((s) => core.parsePhoneNumberFromString(nat, iso, sliceOf(iso, s))?.getType() ?? 'undefined');
  lm += STRATEGIES.length;
  lok += got.filter((g) => g === a).length;
  row(iso.padEnd(5), nat.padEnd(13), String(a).padEnd(24), ...got.map((g) => `${g}${g === a ? '' : ' DIFF'}`.padEnd(24)), note);
}
row('');
row(`landline getType parity: ${lok}/${lm}`);

// ─────────────────────────────────────────────────────────────────────────────
h('S9.7g — D6c E.164 round-trip via parsePhoneNumberFromString(national, COUNTRY)');
const S83 = [
  ['BE', '470123456', '+32470123456'],
  ['BE', '0470123456', '+32470123456'],
  ['NL', '0612345678', '+31612345678'],
  ['DE', '015112345678', '+4915112345678'],
  ['FR', '0612345678', '+33612345678'],
  ['GB', '07911123456', '+447911123456'],
  ['IT', '0212345678', '+390212345678'],
  ['IT', '3331234567', '+393331234567'],
  ['HU', '301234567', '+36301234567'],
  ['RU', '9011234567', '+79011234567'],
  ['RU', '89011234567', '+79011234567'],
  ['RU', '8001234567', '+78001234567'],
  ['LT', '80012345', '+37080012345'],
  ['CA', '4165551234', '+14165551234'],
  ['US', '2125551234', '+12125551234'],
  ['US', '12125551234', '+12125551234'],
  ['AR', '91123456789', '+5491123456789'],
  ['AR', '1123456789', '+541123456789'],
  ['MX', '5512345678', '+525512345678'],
  ['VA', '0669812345', '+390669812345'],
  ['IT', '0212345', '+390212345'],
  ['KZ', '7012345678', '+77012345678'],
  ['BB', '2462345678', '+12462345678'],
];
row('iso'.padEnd(5), 'national'.padEnd(14), 'expected'.padEnd(16), 'max'.padEnd(18), ...STRATEGIES.map((s) => s.padEnd(18)));
const rtScore = { max: 0, country: 0, withFormats: 0, withMain: 0 };
for (const [iso, nat, expected] of S83) {
  const a = maxSet.parsePhoneNumberFromString(nat, iso)?.number ?? 'null';
  if (a === expected) rtScore.max++;
  const got = STRATEGIES.map((s) => core.parsePhoneNumberFromString(nat, iso, sliceOf(iso, s))?.number ?? 'null');
  STRATEGIES.forEach((s, i) => {
    if (got[i] === expected) rtScore[s]++;
  });
  row(
    iso.padEnd(5),
    nat.padEnd(14),
    expected.padEnd(16),
    `${a}${a === expected ? ' ok' : ' NO'}`.padEnd(18),
    ...got.map((g) => `${g}${g === expected ? ' ok' : ' NO'}`.padEnd(18)),
  );
}
row('');
row(`round-trip: max ${rtScore.max}/${S83.length}  ` + STRATEGIES.map((s) => `${s} ${rtScore[s]}/${S83.length}`).join('  '));

h('S9.7g2 — the same over all 244 example numbers');
for (const strategy of STRATEGIES) {
  let n = 0;
  let agree = 0;
  const diffs = [];
  for (const iso of ALL) {
    const nat = examples[iso];
    if (!nat) continue;
    n++;
    const a = maxSet.parsePhoneNumberFromString(nat, iso)?.number ?? 'null';
    const b = core.parsePhoneNumberFromString(nat, iso, sliceOf(iso, strategy))?.number ?? 'null';
    if (a === b) agree++;
    else if (diffs.length < 20) diffs.push(`${iso} ${nat}: max=${a} slice=${b}`);
  }
  row(`${strategy.padEnd(12)} ${agree}/${n} E.164 identical  (${n - agree} differ)`);
  for (const d of diffs) row(`     ${d}`);
}

// ─────────────────────────────────────────────────────────────────────────────
h('S9.7h — splitE164 / formRestore (D15): parse a full E.164 with a slice');
// D15 restores a value that may name a DIFFERENT country than the one currently
// selected. With a per-country slice the metadata for that country is not loaded
// yet — so who resolves the country? Measured here.
row('e164'.padEnd(16), 'max country/nat'.padEnd(22), 'slice of the SAME country'.padEnd(28), 'slice of a DIFFERENT country');
for (const [e164, own, other] of [
  ['+32470123456', 'BE', 'US'],
  ['+31612345678', 'NL', 'BE'],
  ['+14165551234', 'CA', 'BE'],
  ['+78001234567', 'RU', 'BE'],
  ['+390212345678', 'IT', 'BE'],
]) {
  const p = maxSet.parsePhoneNumberFromString(e164);
  const a = core.parsePhoneNumberFromString(e164, sliceOf(own, 'withFormats'));
  let b;
  try {
    b = core.parsePhoneNumberFromString(e164, sliceOf(other, 'withFormats'));
    b = b ? `${b.country}/${b.nationalNumber}` : 'undefined';
  } catch (e) {
    b = `THROWS: ${e.message}`;
  }
  row(
    e164.padEnd(16),
    `${p?.country}/${p?.nationalNumber}`.padEnd(22),
    `${a ? `${a.country}/${a.nationalNumber}` : 'undefined'}`.padEnd(28),
    b,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
h('S9.7i — hostile input: does a slice throw where /max does not?');
const HOSTILE = [
  ['', 'empty'],
  ['+', 'lone plus'],
  ['+1', 'calling code only'],
  ['+999', 'unassigned calling code'],
  ['+8001234567', 'non-geographic (800) — the slice has no nonGeographic section'],
  ['+8701234567', 'non-geographic (870)'],
  ['abc', 'letters'],
  ['+32470123456789012345', 'absurdly long'],
  ['00470123456', '00 international prefix'],
];
row('input'.padEnd(24), 'max'.padEnd(26), 'slice(BE)');
for (const [input, note] of HOSTILE) {
  const call = (fn) => {
    try {
      const r = fn();
      return r === undefined ? 'undefined' : String(r?.number ?? r);
    } catch (e) {
      return `THROWS ${e.message.slice(0, 40)}`;
    }
  };
  row(
    JSON.stringify(input).padEnd(24),
    call(() => maxSet.parsePhoneNumberFromString(input)).padEnd(26),
    `${call(() => core.parsePhoneNumberFromString(input, beMd))}   (${note})`,
  );
}
row('');
row('and through AsYouType (the formatter runs on every keystroke):');
for (const [input, note] of HOSTILE) {
  const call = (fn) => {
    try {
      return JSON.stringify(fn());
    } catch (e) {
      return `THROWS ${e.message.slice(0, 40)}`;
    }
  };
  row(
    JSON.stringify(input).padEnd(24),
    call(() => new maxSet.AsYouType().input(input)).padEnd(26),
    `${call(() => new core.AsYouType(undefined, beMd).input(input))}   (${note})`,
  );
}
