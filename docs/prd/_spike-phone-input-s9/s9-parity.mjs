// S9.12 — full parity sweep for the FINAL slice unit (one chunk per calling code).
//
//   node docs/prd/_spike-phone-input-s9/s9-parity.mjs
//
// `/max` is the oracle. Four dimensions, every one over all 244 countries:
//   formatting at every keystroke, isValid, validatePhoneNumberLength, getType,
//   plus the E.164 round-trip and the cross-sibling class a per-COUNTRY slice
//   failed (586/640).
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as maxSet from 'libphonenumber-js/max';
import * as core from 'libphonenumber-js/core';
import { sliceBlock } from './slice.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const full = JSON.parse(readFileSync(join(repoRoot, 'node_modules/libphonenumber-js/metadata.max.json'), 'utf8'));
const examples = JSON.parse(readFileSync(join(repoRoot, 'node_modules/libphonenumber-js/examples.mobile.json'), 'utf8'));

const h = (s) => console.log(`\n${'='.repeat(78)}\n${s}\n${'='.repeat(78)}`);
const row = (...c) => console.log('  ' + c.join('  '));

const ALL = Object.keys(full.countries).filter((c) => c !== '001');
const cache = new Map();
const md = (iso) => {
  const cc = full.countries[iso][0];
  if (!cache.has(cc)) cache.set(cc, sliceBlock(full, full.country_calling_codes[cc][0]));
  return cache.get(cc);
};

function stripCallingCode(f, n) {
  let seen = 0;
  let i = 0;
  for (; i < f.length && seen < n; i++) if (/\d/.test(f[i])) seen++;
  while (i < f.length && !/\d/.test(f[i])) i++;
  return f.slice(i);
}
const fmtFull = (dial, nat) => stripCallingCode(new maxSet.AsYouType().input(`+${dial}${nat}`), dial.length);
const fmtSlice = (dial, nat, m) => stripCallingCode(new core.AsYouType(undefined, m).input(`+${dial}${nat}`), dial.length);

const report = (label, checks) => {
  const bad = checks.filter((c) => !c.ok);
  row(`${label.padEnd(46)} ${checks.length - bad.length}/${checks.length}${bad.length ? '  DIVERGES' : ''}`);
  for (const b of bad.slice(0, 20)) row(`     ${b.note}`);
  return bad.length;
};

let totalDiv = 0;

h('S9.12a — AsYouType formatting, every keystroke, all countries');
{
  const checks = [];
  for (const iso of ALL) {
    const nat = examples[iso];
    if (!nat) continue;
    const dial = full.countries[iso][0];
    const digits = nat.replace(/\D/g, '');
    for (let n = 1; n <= digits.length; n++) {
      const part = digits.slice(0, n);
      const a = fmtFull(dial, part);
      const b = fmtSlice(dial, part, md(iso));
      checks.push({ ok: a === b, note: `${iso} "${part}": max="${a}" slice="${b}"` });
    }
  }
  totalDiv += report('keystrokes identical', checks);
}

h('S9.12b — isValidPhoneNumber: valid / one short / one long, E.164 and national forms');
{
  const checks = [];
  for (const iso of ALL) {
    const nat = examples[iso];
    if (!nat) continue;
    const p = maxSet.parsePhoneNumberFromString(nat, iso);
    if (!p) continue;
    const m = md(iso);
    for (const num of [p.number, p.number.slice(0, -1), `${p.number}7`]) {
      checks.push({
        ok: maxSet.isValidPhoneNumber(num) === core.isValidPhoneNumber(num, m),
        note: `${iso} E164 ${num}: max=${maxSet.isValidPhoneNumber(num)} slice=${core.isValidPhoneNumber(num, m)}`,
      });
    }
    for (const num of [p.nationalNumber, p.nationalNumber.slice(0, -1), `${p.nationalNumber}7`]) {
      checks.push({
        ok: maxSet.isValidPhoneNumber(num, iso) === core.isValidPhoneNumber(num, iso, m),
        note: `${iso} nat ${num}: max=${maxSet.isValidPhoneNumber(num, iso)} slice=${core.isValidPhoneNumber(num, iso, m)}`,
      });
    }
  }
  totalDiv += report('validity verdicts identical', checks);
}

h('S9.12c — validatePhoneNumberLength on every prefix + two over-long variants');
{
  const checks = [];
  for (const iso of ALL) {
    const nat = examples[iso];
    if (!nat) continue;
    const digits = nat.replace(/\D/g, '');
    const m = md(iso);
    for (let k = 1; k <= digits.length + 2; k++) {
      const part = `${digits}77`.slice(0, k);
      const a = maxSet.validatePhoneNumberLength(part, iso) ?? 'OK';
      const b = core.validatePhoneNumberLength(part, iso, m) ?? 'OK';
      checks.push({ ok: a === b, note: `${iso} "${part}": max=${a} slice=${b}` });
    }
  }
  totalDiv += report('length verdicts identical', checks);
}

h('S9.12d — getType(), and the E.164 round-trip');
{
  const types = [];
  const trips = [];
  for (const iso of ALL) {
    const nat = examples[iso];
    if (!nat) continue;
    const m = md(iso);
    const a = maxSet.parsePhoneNumberFromString(nat, iso);
    const b = core.parsePhoneNumberFromString(nat, iso, m);
    types.push({
      ok: (a?.getType() ?? null) === (b?.getType() ?? null),
      note: `${iso} ${nat}: max=${a?.getType()} slice=${b?.getType()}`,
    });
    trips.push({
      ok: (a?.number ?? null) === (b?.number ?? null),
      note: `${iso} ${nat}: max=${a?.number} slice=${b?.number}`,
    });
  }
  totalDiv += report('getType identical', types);
  totalDiv += report('E.164 identical', trips);
}

h('S9.12e — the CROSS-SIBLING class that broke the per-country slice (586/640)');
{
  const checks = [];
  const shared = Object.entries(full.country_calling_codes).filter(([, m]) => m.length > 1);
  for (const [, members] of shared) {
    for (const home of members) {
      const m = md(home);
      for (const other of members) {
        if (other === home) continue;
        const nat = examples[other];
        if (!nat) continue;
        const a = maxSet.isValidPhoneNumber(nat, home);
        const b = core.isValidPhoneNumber(nat, home, m);
        const ta = maxSet.parsePhoneNumberFromString(nat, home)?.getType() ?? null;
        const tb = core.parsePhoneNumberFromString(nat, home, m)?.getType() ?? null;
        checks.push({
          ok: a === b && ta === tb,
          note: `selected=${home} number=${nat} (belongs to ${other}): valid max=${a} slice=${b}, type max=${ta} slice=${tb}`,
        });
      }
    }
  }
  row(`${shared.length} shared calling codes, ${checks.length} sibling-number cases`);
  totalDiv += report('sibling verdicts identical', checks);
}

h('S9.12f — hostile input parity (the formatter runs on every keystroke)');
{
  const checks = [];
  const beM = md('BE');
  for (const input of ['', '+', '+1', '+999', 'abc', '00470123456', '+32470123456789012345', '+8001234567']) {
    const a = new maxSet.AsYouType().input(input);
    const b = new core.AsYouType(undefined, beM).input(input);
    checks.push({ ok: a === b, note: `AsYouType(${JSON.stringify(input)}): max=${JSON.stringify(a)} slice=${JSON.stringify(b)}` });
  }
  report('hostile-input formatting identical', checks);
  row('(the +800 non-geographic difference is expected and unreachable: no selectable');
  row(' country has a non-geographic calling code — see S9.9c)');
}

h('S9.12g — corpus size, final unit');
{
  const ccs = [...new Set(ALL.map((c) => full.countries[c][0]))];
  const sizes = ccs.map((cc) => {
    const s = JSON.stringify(sliceBlock(full, full.country_calling_codes[cc][0]));
    return [cc, s.length, gzipSync(Buffer.from(s)).length];
  });
  sizes.sort((a, b) => a[2] - b[2]);
  row(`chunks: ${sizes.length} (one per calling code, covering ${ALL.length} countries)`);
  row(`gzip: min ${sizes[0][2]} B (+${sizes[0][0]})  median ${sizes[sizes.length >> 1][2]} B  max ${sizes.at(-1)[2]} B (+${sizes.at(-1)[0]})`);
  row(`total: ${sizes.reduce((n, s) => n + s[1], 0)} B raw / ${sizes.reduce((n, s) => n + s[2], 0)} B gzip`);
  row(`largest 5: ${sizes.slice(-5).map(([cc, , g]) => `+${cc}:${g}`).join(' ')}`);
}

h(totalDiv === 0 ? 'S9.12 VERDICT: ZERO divergences from full /max' : `S9.12 VERDICT: ${totalDiv} divergences`);
