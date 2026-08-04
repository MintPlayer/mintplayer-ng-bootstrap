// S9.1 — per-country metadata size, measured three ways, plus the /core fixed cost.
//
//   node docs/prd/_spike-phone-input-s9/s9-sizes.mjs
import { readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slice, mainCountryFor, hasOwnFormats } from './slice.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const lpn = join(repoRoot, 'node_modules/libphonenumber-js');
const esbuild = join(repoRoot, 'node_modules/esbuild/bin/esbuild');
const tmp = join(here, 'tmp');

const h = (s) => console.log(`\n${'='.repeat(78)}\n${s}\n${'='.repeat(78)}`);
const row = (...c) => console.log('  ' + c.join('  '));
const gz = (s) => gzipSync(Buffer.from(s)).length;

const full = JSON.parse(readFileSync(join(lpn, 'metadata.max.json'), 'utf8'));
const SPREAD = 'be nl de fr gb us ca it ru cn in br au jp sa'.split(' ');
const ALL = Object.keys(full.countries).filter((c) => c !== '001');

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
h('S9.1a — baseline: what the PRD ships today (whole-set chunks)');
// Two variants, because the PRD's 57 KB and my first run disagreed: `export *`
// keeps every exported function, while the real phone-core facade uses four.
const USED = 'parsePhoneNumberFromString, AsYouType, isValidPhoneNumber, validatePhoneNumberLength';
row('set'.padEnd(8), 'json raw'.padEnd(12), 'json gzip'.padEnd(12), 'chunk min'.padEnd(13), 'chunk gzip'.padEnd(13), 'shape');
for (const set of ['min', 'max']) {
  const json = readFileSync(join(lpn, `metadata.${set}.json`));
  for (const [shape, src] of [
    ['all exports', `export * from 'libphonenumber-js/${set}';\n`],
    ['4 used fns', `import { ${USED} } from 'libphonenumber-js/${set}';\nexport { ${USED} };\n`],
  ]) {
    const tag = `whole-${set}-${shape.replace(/\W+/g, '')}`;
    const entry = join(tmp, `${tag}.mjs`);
    writeFileSync(entry, src);
    execFileSync(process.execPath, [
      esbuild, entry, '--bundle', '--format=esm', '--minify', '--platform=browser',
      '--log-level=silent', `--outfile=${join(tmp, `${tag}.bundle.mjs`)}`,
    ], { cwd: repoRoot });
    const bundle = readFileSync(join(tmp, `${tag}.bundle.mjs`));
    row(
      set.padEnd(8),
      `${json.length}`.padEnd(12),
      `${gzipSync(json).length}`.padEnd(12),
      `${bundle.length}`.padEnd(13),
      `${gzipSync(bundle).length}`.padEnd(13),
      shape,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
h('S9.1b — the /core fixed cost (code only, no metadata)');
// Only what phone-core actually calls, so tree-shaking is honest.
const coreEntry = join(tmp, 'core-used.mjs');
writeFileSync(coreEntry, [
  "import { parsePhoneNumberFromString, AsYouType, isValidPhoneNumber, validatePhoneNumberLength } from 'libphonenumber-js/core';",
  'export { parsePhoneNumberFromString, AsYouType, isValidPhoneNumber, validatePhoneNumberLength };',
  '',
].join('\n'));
const coreOut = join(tmp, 'core-used.bundle.mjs');
execFileSync(process.execPath, [
  esbuild, coreEntry, '--bundle', '--format=esm', '--minify', '--platform=browser',
  '--log-level=silent', `--outfile=${coreOut}`,
], { cwd: repoRoot });
const coreBytes = readFileSync(coreOut);
row(`libphonenumber-js/core (the 4 functions we use): ${coreBytes.length} B min / ${gzipSync(coreBytes).length} B gzip`);

// The whole-set entry bundles the same code, so the metadata's own share is the difference.
const maxBundle = readFileSync(join(tmp, 'whole-max-4usedfns.bundle.mjs'));
row(`whole-max bundle minus /core code:               ${maxBundle.length - coreBytes.length} B min (metadata's share)`);

// ─────────────────────────────────────────────────────────────────────────────
h('S9.2 — is a per-country slice self-contained? (format inheritance)');
const inherits = ALL.filter((c) => !hasOwnFormats(full, c));
row(`countries with NO formats of their own (inherit from the main country): ${inherits.length} of ${ALL.length}`);
row(`  ${inherits.join(' ')}`);
row('');
row('their main countries:');
const byMain = {};
for (const c of inherits) (byMain[mainCountryFor(full, c)] ??= []).push(c);
for (const [m, cs] of Object.entries(byMain)) row(`  ${m} → ${cs.join(' ')}`);

// ─────────────────────────────────────────────────────────────────────────────
h('S9.3 — per-country slice size, three strategies (JSON raw / gzip)');
const strategies = ['country', 'withFormats', 'withMain'];
row('iso2'.padEnd(6), ...strategies.map((s) => `${s} raw/gzip`.padEnd(22)), 'main');
for (const iso of SPREAD) {
  const cells = strategies.map((s) => {
    const json = JSON.stringify(slice(full, iso.toUpperCase(), s));
    return `${json.length} / ${gz(json)}`.padEnd(22);
  });
  row(iso.padEnd(6), ...cells, mainCountryFor(full, iso.toUpperCase()));
}

h('S9.3b — the same slices as MINIFIED ESM CHUNKS (what a consumer downloads)');
// A chunk is `export default <object literal>` — that is what the generated
// per-country .ts module compiles to.
function chunkFor(iso, strategy) {
  const src = `export default ${JSON.stringify(slice(full, iso.toUpperCase(), strategy))};\n`;
  const file = join(tmp, `md-${iso}-${strategy}.mjs`);
  writeFileSync(file, src);
  const out = join(tmp, `md-${iso}-${strategy}.min.mjs`);
  execFileSync(process.execPath, [esbuild, file, '--minify', '--format=esm', '--log-level=silent', `--outfile=${out}`], { cwd: repoRoot });
  return readFileSync(out);
}
row('iso2'.padEnd(6), ...strategies.map((s) => `${s} min/gzip`.padEnd(22)));
for (const iso of SPREAD) {
  row(iso.padEnd(6), ...strategies.map((s) => {
    const b = chunkFor(iso, s);
    return `${b.length} / ${gzipSync(b).length}`.padEnd(22);
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
h('S9.4 — the whole corpus: all 244 slices at once');
for (const strategy of strategies) {
  let raw = 0;
  let gzipSum = 0;
  let max = { iso: null, n: 0 };
  const sizes = [];
  for (const iso of ALL) {
    const json = JSON.stringify(slice(full, iso, strategy));
    raw += json.length;
    const g = gz(json);
    gzipSum += g;
    sizes.push(g);
    if (g > max.n) max = { iso, n: g };
  }
  sizes.sort((a, b) => a - b);
  row(
    strategy.padEnd(12),
    `total raw ${raw} B`.padEnd(20),
    `total gzip ${gzipSum} B`.padEnd(20),
    `median ${sizes[sizes.length >> 1]} B`.padEnd(14),
    `min ${sizes[0]} B`.padEnd(11),
    `max ${max.n} B (${max.iso})`,
  );
}

const smallest = ALL.map((c) => [c, gz(JSON.stringify(slice(full, c, 'withFormats')))]).sort((a, b) => a[1] - b[1]);
row('');
row(`smallest 5 (withFormats): ${smallest.slice(0, 5).map(([c, n]) => `${c}:${n}`).join(' ')}`);
row(`largest 5  (withFormats): ${smallest.slice(-5).map(([c, n]) => `${c}:${n}`).join(' ')}`);

// ─────────────────────────────────────────────────────────────────────────────
h('S9.5 — break-even: how many country switches before per-country costs more?');
const coreGz = gzipSync(coreBytes).length;
const wholeGz = gzipSync(maxBundle).length;
const perCountry = SPREAD.map((iso) => {
  const b = chunkFor(iso, 'withFormats');
  return gzipSync(b).length;
});
const medianPer = perCountry.slice().sort((a, b) => a - b)[perCountry.length >> 1];
row(`whole /max lazy chunk (code + metadata):  ${wholeGz} B gzip — paid once, any number of countries`);
row(`/core lazy chunk (code only):             ${coreGz} B gzip — paid once`);
row(`median per-country chunk:                 ${medianPer} B gzip — paid per country the user visits`);
row('');
row(`per-country total for N countries = ${coreGz} + N × ${medianPer}`);
row(`break-even N = (${wholeGz} - ${coreGz}) / ${medianPer} = ${((wholeGz - coreGz) / medianPer).toFixed(1)} countries`);
row(`  N=1: ${coreGz + medianPer} B  (saves ${wholeGz - coreGz - medianPer} B)`);
row(`  N=2: ${coreGz + 2 * medianPer} B`);
row(`  N=5: ${coreGz + 5 * medianPer} B`);

// ─────────────────────────────────────────────────────────────────────────────
h('S9.6 — eager cost of the generated loader map (244 static imports)');
const mapSrc = [
  'export const metadataLoaders = {',
  ...ALL.map((c) => `  '${c.toLowerCase()}': () => import('./metadata/${c.toLowerCase()}.generated').then((m) => m.default),`),
  '};',
  '',
].join('\n');
const mapFile = join(tmp, 'loader-map.mjs');
writeFileSync(mapFile, mapSrc);
// Measured unbundled (esbuild would follow the imports); this is the shape the
// eager entry keeps, exactly like flags/src/flag-loaders.generated.ts.
row(`loader map source: ${mapSrc.length} B raw / ${gz(mapSrc)} B gzip`);
const minMap = execFileSync(process.execPath, [esbuild, mapFile, '--minify', '--format=esm', '--log-level=silent'], { cwd: repoRoot });
row(`loader map minified: ${minMap.length} B min / ${gzipSync(minMap).length} B gzip`);

console.log(`\ntmp artifacts at ${tmp}`);
console.log(`(tmp file count: ${readdirSync(tmp).length}, total ${readdirSync(tmp).reduce((n, f) => n + statSync(join(tmp, f)).size, 0)} B)`);
