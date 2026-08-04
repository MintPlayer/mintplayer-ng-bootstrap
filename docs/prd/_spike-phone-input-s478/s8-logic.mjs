// S8 — dial-string detection and E.164 logic. Pure logic, no DOM.
//
//   node docs/prd/_spike-phone-input-s478/s8-logic.mjs
//
// Everything here runs against the real `intl-tel-input/data` table and the real
// `libphonenumber-js` metadata sets, so every line of output is a measurement.
import { rawCountryData } from 'intl-tel-input/data';
import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { formatNationalViaInternational, formatNationalDirect } from './phone-format.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const h = (s) => console.log(`\n${'='.repeat(78)}\n${s}\n${'='.repeat(78)}`);
const row = (...cells) => console.log('  ' + cells.join('  '));

// ─────────────────────────────────────────────────────────────────────────────
// The table, as the PRD proposes to use it.
// ─────────────────────────────────────────────────────────────────────────────
const COUNTRIES = rawCountryData.map(([iso2, dialCode, priority, areaCodes, nationalPrefix]) => ({
  iso2,
  dialCode,
  priority: priority ?? 0,
  areaCodes: areaCodes ?? null,
  nationalPrefix: nationalPrefix ?? null,
}));

/**
 * The candidate algorithm from PRD §5.5: longest prefix over dialCode + areaCodes,
 * ties broken by `priority` (lower wins).
 */
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
        // A country WITH area codes that did not match must never beat a plain
        // dial-code match at the same length, or `ca` (priority 1) would be
        // reported for every unlisted +1 area code.
        !(best.areaHit && !candidate.areaHit) &&
        (candidate.areaHit === best.areaHit ? candidate.priority < best.priority : candidate.areaHit))
    ) {
      best = candidate;
    }
  }
  return best;
}

h('S8.0 — the table as shipped');
row(`entries: ${COUNTRIES.length}`);
row(`with areaCodes: ${COUNTRIES.filter((c) => c.areaCodes).length}`);
row(`sharing a dial code with another entry: ${
  COUNTRIES.filter((c) => COUNTRIES.some((o) => o !== c && o.dialCode === c.dialCode)).length
}`);
const raw = JSON.stringify(rawCountryData);
row(`rawCountryData JSON: ${raw.length} B raw / ${gzipSync(raw).length} B gzip`);
row(`dist file: ${statSync(resolve(here, 'node_modules/intl-tel-input/dist/js/data.mjs')).size} B raw / ${
  gzipSync(readFileSync(resolve(here, 'node_modules/intl-tel-input/dist/js/data.mjs'))).length
} B gzip`);

// ─────────────────────────────────────────────────────────────────────────────
// S8.1 — NANP disambiguation, table vs libphonenumber
// ─────────────────────────────────────────────────────────────────────────────
const { parsePhoneNumberFromString, AsYouType, validatePhoneNumberLength, isValidPhoneNumber, parseIncompletePhoneNumber } =
  await import('libphonenumber-js/min');

const S81 = [
  ['+14165551234', 'ca', 'Toronto'],
  ['+12125551234', 'us', 'New York'],
  ['+12465551234', 'bb', 'Barbados'],
  ['+12425551234', 'bs', 'Bahamas'],
  ['+17875551234', 'pr', 'Puerto Rico'],
  ['+13405551234', 'vi', 'US Virgin Islands'],
  ['+16045551234', 'ca', 'Vancouver'],
  ['+19995551234', 'us', 'unassigned NANP area code (no right answer)'],
  ['+18005551234', 'us', 'NANP toll-free (shared US/CA — no country truly owns it)'],
  ['+79015551234', 'ru', 'Russia mobile'],
  ['+77015551234', 'kz', 'Kazakhstan mobile'],
  ['+390669812345', 'va', 'Vatican (inside Italy)'],
  ['+390212345678', 'it', 'Milan'],
  ['+590590123456', 'gp', 'Guadeloupe'],
  ['+599 9 1234567'.replace(/\D/g, '').replace(/^/, '+'), 'cw', 'Curaçao'],
  ['+5993181234', 'bq', 'Bonaire'],
  ['+441481123456', 'gg', 'Guernsey landline, INVALID length — libphonenumber refuses to name a country'],
  ['+447911123456', 'gg', '07911 is a Guernsey mobile range, not GB (both mechanisms agree)'],
  ['+9995551234', null, 'garbage: +999 is unassigned'],
];

h('S8.1 — NANP / shared-dial-code disambiguation: intl-tel-input table vs libphonenumber');
row('E.164'.padEnd(16), 'expect'.padEnd(7), 'table'.padEnd(20), 'libphonenumber'.padEnd(15), 'note');
let tableRight = 0;
let lpnRight = 0;
for (const [e164, expect, note] of S81) {
  const digits = e164.replace(/\D/g, '');
  const t = countryFromDigits(digits);
  const parsed = parsePhoneNumberFromString(e164);
  const tIso = t ? t.iso2 : null;
  const lIso = parsed?.country?.toLowerCase() ?? null;
  if (tIso === expect) tableRight++;
  if (lIso === expect) lpnRight++;
  row(
    e164.padEnd(16),
    String(expect).padEnd(7),
    `${String(tIso)}${tIso === expect ? ' ok ' : ' NO '}(len ${t?.matchLen ?? '-'}, prio ${t?.priority ?? '-'})`.padEnd(20),
    `${String(lIso)}${lIso === expect ? ' ok' : ' NO'}${parsed ? '' : ' [unparseable]'}`.padEnd(15),
    note,
  );
}
row('');
row(`table correct: ${tableRight}/${S81.length}   libphonenumber correct: ${lpnRight}/${S81.length}`);

h('S8.1b — does libphonenumber ALONE suffice? (the design question)');
// Sweep every country: pick a valid example number, then ask each mechanism.
const examples = JSON.parse(readFileSync(resolve(here, 'node_modules/libphonenumber-js/examples.mobile.json'), 'utf8'));
let both = 0;
let tableOnly = 0;
let lpnOnly = 0;
let neither = 0;
const disagreements = [];
const bothWrong = [];
for (const c of COUNTRIES) {
  const nat = examples[c.iso2.toUpperCase()];
  if (!nat) continue;
  const e164 = parsePhoneNumberFromString(nat, c.iso2.toUpperCase())?.number;
  if (!e164) continue;
  const digits = e164.slice(1);
  const t = countryFromDigits(digits)?.iso2 ?? null;
  const l = parsePhoneNumberFromString(e164)?.country?.toLowerCase() ?? null;
  const tOk = t === c.iso2;
  const lOk = l === c.iso2;
  if (tOk && lOk) both++;
  else if (tOk) tableOnly++;
  else if (lOk) lpnOnly++;
  else {
    neither++;
    bothWrong.push({ iso2: c.iso2, e164, table: t, lpn: l });
  }
  if (tOk !== lOk) disagreements.push({ iso2: c.iso2, e164, table: t, lpn: l });
}
row(`countries with a mobile example number: ${both + tableOnly + lpnOnly + neither}`);
row(`both agree with the source country: ${both}`);
row(`table right, libphonenumber wrong:   ${tableOnly}`);
row(`libphonenumber right, table wrong:   ${lpnOnly}`);
row(`both wrong:                          ${neither}`);
row('');
row('disagreements (one mechanism right, the other wrong):');
for (const d of disagreements) row(`   ${d.iso2}  ${d.e164}  table=${d.table}  lpn=${d.lpn}`);
row('');
row('both wrong (the example number genuinely belongs to a shared-range neighbour):');
for (const d of bothWrong) row(`   ${d.iso2}  ${d.e164}  table=${d.table}  lpn=${d.lpn}`);

// ─────────────────────────────────────────────────────────────────────────────
// S8.2 — typed/pasted "+XX" into the national input
// ─────────────────────────────────────────────────────────────────────────────
h('S8.2 — paste/typed +XX into the NATIONAL input → country switch + prefix strip');

/**
 * The rule under test. `raw` is whatever landed in the national input.
 * Returns null when the input is not a dial string (leave the country alone).
 */
function detectDialString(raw, currentCountry) {
  const trimmed = raw.trim().replace(/^00/, '+');
  if (!trimmed.startsWith('+')) return null;
  const digits = trimmed.slice(1).replace(/\D/g, '');
  if (!digits) return null;

  // libphonenumber first — it owns the metadata and knows area codes properly.
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  if (parsed?.country) {
    return {
      via: 'libphonenumber',
      country: parsed.country.toLowerCase(),
      dialCode: parsed.countryCallingCode,
      national: parsed.nationalNumber,
    };
  }
  // Fall back to the table for partial/typed-so-far input libphonenumber cannot
  // yet resolve, and keep the CURRENT country when it also matches the prefix —
  // switching a user off `us` onto `ca` mid-typing would be hostile.
  const t = countryFromDigits(digits);
  if (!t) return null;
  const cur = COUNTRIES.find((c) => c.iso2 === currentCountry);
  const keepCurrent = cur && digits.startsWith(cur.dialCode) && cur.dialCode.length === t.dialCode.length;
  const pick = keepCurrent ? cur : t;
  return {
    via: keepCurrent ? 'table (kept current)' : 'table',
    country: pick.iso2,
    dialCode: pick.dialCode,
    national: digits.slice(pick.dialCode.length),
  };
}

const S82 = [
  ['+32470123456', 'be', 'unambiguous'],
  ['0032470123456', 'be', '00 international prefix instead of +'],
  ['+32 470 12 34 56', 'be', 'pasted with the separators the source site used'],
  ['+1 416 555 1234', 'ca', 'ambiguous NANP → Toronto'],
  ['+1 212 555 1234', 'us', 'ambiguous NANP → New York'],
  ['+1 246 555 1234', 'bb', 'ambiguous NANP → Barbados'],
  ['+7 701 555 1234', 'kz', 'shared dial code 7'],
  ['+7 495 555 1234', 'ru', 'shared dial code 7'],
  ['+39 06 698 12345', 'va', 'shared dial code 39 (Vatican)'],
  ['+590 590 123456', 'gp', 'shared dial code 590'],
  ['+1242 555 1234', 'bs', 'dial code that is a prefix of another (+1 vs +1242)'],
  ['+999 555 1234', null, 'garbage dial code'],
  ['+1', null, 'just the dial code, nothing else'],
  ['+', null, 'a lone plus'],
  ['470123456', null, 'not a dial string at all — must NOT switch country'],
  ['+321', null, 'too short to resolve'],
];

row('input'.padEnd(20), 'expect'.padEnd(7), 'got'.padEnd(8), 'via'.padEnd(22), 'national'.padEnd(12), 'note');
let s82ok = 0;
for (const [input, expect, note] of S82) {
  const r = detectDialString(input, 'us');
  const got = r?.country ?? null;
  const ok = got === expect;
  if (ok) s82ok++;
  row(
    JSON.stringify(input).padEnd(20),
    String(expect).padEnd(7),
    `${String(got)}${ok ? ' ok' : ' NO'}`.padEnd(8),
    String(r?.via ?? '-').padEnd(22),
    String(r?.national ?? '-').padEnd(12),
    note,
  );
}
row('');
row(`S8.2: ${s82ok}/${S82.length} correct`);

h('S8.2b — the progressive-typing hazard: the user types "+3247…" one key at a time');
row('digits so far'.padEnd(16), 'country'.padEnd(10), 'via'.padEnd(22), 'national');
let progressive = '';
for (const ch of '+32470123456') {
  progressive += ch;
  const r = detectDialString(progressive, 'us');
  row(progressive.padEnd(16), String(r?.country ?? '-').padEnd(10), String(r?.via ?? '-').padEnd(22), String(r?.national ?? '-'));
}

h('S8.2c — the same for "+1416…" (does the country flip about while typing?)');
progressive = '';
for (const ch of '+14165551234') {
  progressive += ch;
  const r = detectDialString(progressive, 'us');
  row(progressive.padEnd(16), String(r?.country ?? '-').padEnd(10), String(r?.via ?? '-').padEnd(22), String(r?.national ?? '-'));
}

// ─────────────────────────────────────────────────────────────────────────────
// S8.3 — E.164 round-trip
// ─────────────────────────────────────────────────────────────────────────────
h('S8.3 — toE164(country, national) → splitE164 → same pair?');

/** The naive implementation the PRD must NOT ship: strip the national prefix. */
function toE164Naive(country, national) {
  const c = COUNTRIES.find((x) => x.iso2 === country);
  let digits = national.replace(/\D/g, '');
  if (c?.nationalPrefix && digits.startsWith(c.nationalPrefix)) {
    digits = digits.slice(c.nationalPrefix.length);
  }
  return digits ? `+${c.dialCode}${digits}` : null;
}

/**
 * The implementation that survives the table below: let libphonenumber decide,
 * because whether a leading 0 is a trunk prefix or part of the significant number
 * is per-country metadata, not a string rule.
 */
function toE164(country, national) {
  const digits = national.replace(/\D/g, '');
  if (!digits) return null;
  const parsed = parsePhoneNumberFromString(digits, country.toUpperCase());
  if (parsed) return parsed.number;
  // Unparseable (incomplete/invalid): keep the user's digits verbatim rather than
  // guessing — the value is reported as invalid anyway.
  const c = COUNTRIES.find((x) => x.iso2 === country);
  return `+${c.dialCode}${digits}`;
}

function splitE164(e164) {
  const parsed = parsePhoneNumberFromString(e164);
  if (parsed?.country) {
    return { country: parsed.country.toLowerCase(), national: parsed.nationalNumber };
  }
  const t = countryFromDigits(e164.replace(/\D/g, ''));
  return t ? { country: t.iso2, national: e164.replace(/\D/g, '').slice(t.dialCode.length) } : null;
}

const S83 = [
  ['be', '470123456', '+32470123456', 'BE mobile, no trunk prefix typed'],
  ['be', '0470123456', '+32470123456', 'BE mobile WITH the trunk 0 typed'],
  ['nl', '0612345678', '+31612345678', 'NL trunk 0'],
  ['de', '015112345678', '+4915112345678', 'DE trunk 0'],
  ['fr', '0612345678', '+33612345678', 'FR trunk 0'],
  ['gb', '07911123456', '+447911123456', 'GB trunk 0'],
  ['it', '0212345678', '+390212345678', 'IT landline — the 0 is SIGNIFICANT, must NOT be stripped'],
  ['it', '3331234567', '+393331234567', 'IT mobile — no leading 0 at all'],
  ['hu', '301234567', '+36301234567', 'HU mobile (trunk prefix is 06)'],
  ['ru', '9011234567', '+79011234567', 'RU mobile (trunk prefix 8)'],
  ['ru', '89011234567', '+79011234567', 'RU with the trunk 8 typed'],
  ['ca', '4165551234', '+14165551234', 'NANP: nationalPrefix is 1, and 1 is ALSO the dial code'],
  ['us', '2125551234', '+12125551234', 'NANP'],
  ['us', '12125551234', '+12125551234', 'NANP with the trunk 1 typed'],
  ['ar', '91123456789', '+5491123456789', 'AR mobile — libphonenumber inserts a 9'],
  ['mx', '5512345678', '+525512345678', 'MX (the 1 was dropped from the plan in 2019)'],
  ['va', '0669812345', '+390669812345', 'Vatican shares +39 and Italy metadata'],
  // The cases hunted specifically to break `strip the nationalPrefix if present`:
  // a significant number that legitimately BEGINS with the trunk-prefix digit.
  ['ru', '8001234567', '+78001234567', 'RU toll-free 800 — starts with the trunk prefix 8'],
  ['lt', '80012345', '+37080012345', 'LT toll-free 800 — trunk prefix is also 8'],
  ['ar', '1123456789', '+541123456789', 'AR Buenos Aires — WITHOUT a 9 this is the landline form, and libphonenumber correctly does not invent one'],
  ['it', '0212345', '+390212345', 'IT short landline, still keeps its 0'],
];

row('country'.padEnd(8), 'national'.padEnd(14), 'expected E.164'.padEnd(16), 'toE164'.padEnd(19), 'naive'.padEnd(19), 'round-trip'.padEnd(22), 'note');
let good = 0;
let naiveGood = 0;
for (const [country, national, expected, note] of S83) {
  const e164 = toE164(country, national);
  const naive = toE164Naive(country, national);
  const back = e164 ? splitE164(e164) : null;
  const roundTrips = back && toE164(back.country, back.national) === e164;
  if (e164 === expected) good++;
  if (naive === expected) naiveGood++;
  row(
    country.padEnd(8),
    national.padEnd(14),
    expected.padEnd(16),
    `${e164}${e164 === expected ? ' ok' : ' NO'}`.padEnd(19),
    `${naive}${naive === expected ? ' ok' : ' NO'}`.padEnd(19),
    `${back ? back.country + '/' + back.national : 'null'}${roundTrips ? ' ok' : ' NO'}`.padEnd(22),
    note,
  );
}
row('');
row(`libphonenumber-based toE164: ${good}/${S83.length}    naive strip-nationalPrefix: ${naiveGood}/${S83.length}`);

h('S8.3c — table-wide round-trip sweep over every country\'s example mobile number');
let rtOk = 0;
let rtNaiveOk = 0;
const rtFail = [];
const rtNaiveFail = [];
for (const c of COUNTRIES) {
  const nat = examples[c.iso2.toUpperCase()];
  if (!nat) continue;
  const e164 = toE164(c.iso2, nat);
  const naive = toE164Naive(c.iso2, nat);
  const expected = parsePhoneNumberFromString(nat, c.iso2.toUpperCase())?.number;
  if (!expected) continue;
  if (e164 === expected) rtOk++;
  else rtFail.push(`${c.iso2} national=${nat} → ${e164} (expected ${expected})`);
  if (naive === expected) rtNaiveOk++;
  else rtNaiveFail.push(`${c.iso2} national=${nat} → ${naive} (expected ${expected})`);
}
row(`libphonenumber-based toE164: ${rtOk} correct, ${rtFail.length} wrong`);
for (const f of rtFail.slice(0, 15)) row(`     ${f}`);
row(`naive strip-nationalPrefix:  ${rtNaiveOk} correct, ${rtNaiveFail.length} wrong`);
for (const f of rtNaiveFail.slice(0, 15)) row(`     ${f}`);

h('S8.3b — F1: AsYouType(country) on a bare national number formats NOTHING');
row('country'.padEnd(4), 'dial'.padEnd(5), 'national digits'.padEnd(16), 'AsYouType(country)'.padEnd(20), 'via international'.padEnd(20));
for (const [iso, dial, nat] of [
  ['BE', '32', '470123456'],
  ['NL', '31', '612345678'],
  ['DE', '49', '15112345678'],
  ['FR', '33', '612345678'],
  ['GB', '44', '7911123456'],
  ['US', '1', '2125551234'],
  ['IT', '39', '0212345678'],
  ['CA', '1', '4165551234'],
]) {
  const direct = formatNationalDirect(iso, nat);
  row(
    iso.padEnd(4),
    dial.padEnd(5),
    nat.padEnd(16),
    `${JSON.stringify(direct)}${direct === nat ? ' UNFORMATTED' : ''}`.padEnd(20),
    JSON.stringify(formatNationalViaInternational(dial, nat)).padEnd(20),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// S8.4 — metadata sets
// ─────────────────────────────────────────────────────────────────────────────
h('S8.4 — metadata sets: measured size');
row('set'.padEnd(10), 'json raw'.padEnd(12), 'json gzip'.padEnd(12), 'entry chunk raw'.padEnd(18), 'entry chunk gzip');
for (const set of ['min', 'mobile', 'max', 'full']) {
  const json = resolve(here, `node_modules/libphonenumber-js/metadata.${set}.json`);
  const jsonBytes = readFileSync(json);
  // What a bundler actually ships: the ESM entry + its metadata, bundled.
  row(
    set.padEnd(10),
    `${jsonBytes.length}`.padEnd(12),
    `${gzipSync(jsonBytes).length}`.padEnd(12),
    '(see bundle table)'.padEnd(18),
    '',
  );
}

h('S8.4b — validity verdicts per metadata set');
const VALIDITY = [
  ['+32470123456', true, 'BE mobile, valid'],
  ['+3247012345', false, 'BE mobile, one digit short'],
  ['+324701234567', false, 'BE mobile, one digit long'],
  ['+12125551234', true, 'US, valid'],
  ['+390212345678', true, 'IT landline, valid'],
  ['+3902123', false, 'IT landline, too short'],
  ['+442012345678', true, 'GB London landline'],
  ['+4915112345678', true, 'DE mobile'],
  ['+498912345', true, 'DE landline (short but legal)'],
  ['+31612345678', true, 'NL mobile'],
  ['+3161234567', false, 'NL mobile, one short'],
  ['+79011234567', true, 'RU mobile'],
  ['+77011234567', true, 'KZ mobile'],
  ['+9995551234', false, 'unassigned dial code'],
  ['+12125551234567', false, 'far too long'],
];
for (const set of ['min', 'mobile', 'max']) {
  const m = await import(`libphonenumber-js/${set}`);
  const wrong = [];
  for (const [num, expected, note] of VALIDITY) {
    const got = m.isValidPhoneNumber(num);
    if (got !== expected) wrong.push(`${num} (${note}): expected ${expected}, got ${got}`);
  }
  row(`${set}: ${VALIDITY.length - wrong.length}/${VALIDITY.length} correct`);
  for (const w of wrong) row(`     WRONG ${w}`);
}

h('S8.4b2 — how often does each set WRONGLY accept a number that is one digit short/long?');
row('set'.padEnd(10), 'countries'.padEnd(11), 'accepts 1-short'.padEnd(17), 'accepts 1-long'.padEnd(16), 'rejects the VALID number');
for (const set of ['min', 'mobile', 'max']) {
  const m = await import(`libphonenumber-js/${set}`);
  let n = 0;
  let shortAccepted = 0;
  let longAccepted = 0;
  let validRejected = 0;
  const shortExamples = [];
  for (const c of COUNTRIES) {
    const nat = examples[c.iso2.toUpperCase()];
    if (!nat) continue;
    const e164 = parsePhoneNumberFromString(nat, c.iso2.toUpperCase())?.number;
    if (!e164) continue;
    n++;
    if (!m.isValidPhoneNumber(e164)) validRejected++;
    const short = e164.slice(0, -1);
    const long = e164 + '7';
    if (m.isValidPhoneNumber(short)) {
      shortAccepted++;
      if (shortExamples.length < 6) shortExamples.push(`${c.iso2}:${short}`);
    }
    if (m.isValidPhoneNumber(long)) longAccepted++;
  }
  row(
    set.padEnd(10),
    String(n).padEnd(11),
    `${shortAccepted} (${((shortAccepted / n) * 100).toFixed(1)}%)`.padEnd(17),
    `${longAccepted} (${((longAccepted / n) * 100).toFixed(1)}%)`.padEnd(16),
    `${validRejected} (${((validRejected / n) * 100).toFixed(1)}%)`,
  );
  if (shortExamples.length) row(`             falsely-valid short examples: ${shortExamples.join(' ')}`);
}

h('S8.4b3 — does validatePhoneNumberLength catch what isValidPhoneNumber misses on /min?');
row('set'.padEnd(10), 'short numbers /isValid wrongly accepts'.padEnd(40), 'of those, /validateLength catches');
for (const set of ['min', 'max']) {
  const m = await import(`libphonenumber-js/${set}`);
  let wronglyValid = 0;
  let caughtByLength = 0;
  const escaped = [];
  for (const c of COUNTRIES) {
    const nat = examples[c.iso2.toUpperCase()];
    if (!nat) continue;
    const e164 = parsePhoneNumberFromString(nat, c.iso2.toUpperCase())?.number;
    if (!e164) continue;
    const short = e164.slice(0, -1);
    if (!m.isValidPhoneNumber(short)) continue;
    wronglyValid++;
    const verdict = m.validatePhoneNumberLength(short);
    if (verdict) caughtByLength++;
    else if (escaped.length < 8) escaped.push(`${c.iso2}:${short}`);
  }
  row(
    set.padEnd(10),
    String(wronglyValid).padEnd(40),
    `${caughtByLength} — ${wronglyValid - caughtByLength} still slip through`,
  );
  if (escaped.length) row(`             slip through both checks: ${escaped.join(' ')}`);
}

h('S8.4e — formatting parity: does /min format as-you-type identically to /max?');
const [minMod, maxMod] = [await import('libphonenumber-js/min'), await import('libphonenumber-js/max')];
let fmtSame = 0;
const fmtDiff = [];
for (const c of COUNTRIES) {
  const nat = examples[c.iso2.toUpperCase()];
  if (!nat) continue;
  const digits = nat.replace(/\D/g, '');
  const a = new minMod.AsYouType().input(`+${c.dialCode}${digits}`);
  const b = new maxMod.AsYouType().input(`+${c.dialCode}${digits}`);
  if (a === b) fmtSame++;
  else fmtDiff.push(`${c.iso2}: min="${a}" max="${b}"`);
}
row(`identical for ${fmtSame} countries, different for ${fmtDiff.length}`);
for (const d of fmtDiff.slice(0, 12)) row(`     ${d}`);

h('S8.4c — can /min report the number TYPE (mobile vs fixed-line)?');
for (const set of ['min', 'mobile', 'max']) {
  const m = await import(`libphonenumber-js/${set}`);
  const probes = ['+32470123456', '+3223456789', '+12125551234', '+4915112345678'].map((n) => {
    const p = m.parsePhoneNumberFromString(n);
    let type;
    try {
      type = p?.getType?.() ?? 'n/a';
    } catch (e) {
      type = `throws: ${e.message.slice(0, 40)}`;
    }
    return `${n}=${type ?? 'undefined'}`;
  });
  row(`${set}: ${probes.join('  ')}`);
}

h('S8.4d — validatePhoneNumberLength verdicts (the as-you-type guard rail)');
row('input'.padEnd(18), 'verdict');
for (const [num, country] of [
  ['470', 'BE'],
  ['47012345', 'BE'],
  ['470123456', 'BE'],
  ['4701234567', 'BE'],
  ['0212345678', 'IT'],
  ['212555', 'US'],
  ['2125551234', 'US'],
  ['21255512345', 'US'],
]) {
  row(`${country} ${num}`.padEnd(18), String(validatePhoneNumberLength(num, country) ?? 'valid length'));
}
