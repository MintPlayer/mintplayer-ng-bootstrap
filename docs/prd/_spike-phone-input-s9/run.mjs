#!/usr/bin/env node
/**
 * S3/S6 consumer matrix — throwaway. Delete with this directory once the PRD
 * verdicts are recorded.
 *
 * Simulates an npm install of the built library into a temp dir, then consumes
 * it three ways: plain Node (SSR), esbuild `--splitting --format=esm` (what
 * @angular/build uses), and a Vite build (React/Vue demos). Also type-checks a
 * TS consumer, and proves the computed-dynamic-import guard rail by patching a
 * throwaway copy of the published flags entry.
 *
 * Prereq: npx nx build mintplayer-web-components
 * Usage:  node docs/prd/_spike-phone-input-s3s6/run.mjs
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(import.meta.url), '..');
const repoRoot = resolve(here, '..', '..', '..');
const dist = join(repoRoot, 'dist/libs/mintplayer-web-components');
const bin = (p) => join(repoRoot, 'node_modules', p);

if (!existsSync(dist)) {
  console.error('run: build the library first — npx nx build mintplayer-web-components');
  process.exit(1);
}

const root = join(tmpdir(), 'mp-s3s6');
rmSync(root, { recursive: true, force: true });

function makeConsumer(name, { withDeps }) {
  const dir = join(root, name);
  mkdirSync(join(dir, 'node_modules/@mintplayer'), { recursive: true });
  cpSync(dist, join(dir, 'node_modules/@mintplayer/web-components'), { recursive: true });
  if (withDeps) {
    for (const dep of ['libphonenumber-js', 'intl-tel-input']) {
      cpSync(join(repoRoot, 'node_modules', dep), join(dir, `node_modules/${dep}`), { recursive: true });
    }
  }
  writeFileSync(join(dir, 'package.json'), '{ "name": "c", "private": true, "type": "module" }');
  for (const f of ['app.mjs', 'other.mjs', 'probe.ts', 'tsconfig.json', 'vite.config.mjs']) {
    cpSync(join(here, f), join(dir, f));
  }
  return dir;
}

function step(label, fn) {
  try {
    const out = fn();
    console.log(`PASS  ${label}\n${String(out).trim().split('\n').map((l) => `      ${l}`).join('\n')}\n`);
  } catch (err) {
    const out = [err.stdout, err.stderr].filter(Boolean).map(String).join('\n') || String(err.message);
    console.log(`FAIL  ${label}\n${out.trim().split('\n').map((l) => `      ${l}`).join('\n')}\n`);
  }
}

// The library externalises libphonenumber-js / intl-tel-input, so a real consumer
// has them in its own node_modules — that is the configuration under test.
const c = makeConsumer('consumer', { withDeps: true });

step('published phone-core names /core, not /max, and only static specifiers', () => {
  const dir = join(c, 'node_modules/@mintplayer/web-components');
  const entry = readFileSync(join(dir, 'phone-core/index.mjs'), 'utf8');
  const map = readdirSync(join(dir, 'chunks')).find((f) => f.startsWith('metadata-loaders.generated-'));
  const mapSrc = readFileSync(join(dir, 'chunks', map), 'utf8');
  const specifiers = [...`${entry}\n${mapSrc}`.matchAll(/import\(([^)]*)\)/g)].map((m) => m[1].trim());
  const computed = specifiers.filter((s) => !/^["'][^"'`]+["']$/.test(s));
  if (computed.length > 0) throw new Error(`computed import specifier(s): ${computed.join(' | ')}`);
  if (/libphonenumber-js\/(max|min|mobile)/.test(entry)) throw new Error('a whole metadata set is still imported');
  return [
    `${specifiers.length} dynamic imports, all static string literals`,
    `entry externals: ${[...new Set([...entry.matchAll(/from\s*"([^"]+)"/g)].map((m) => m[1]))].join(', ')}`,
    `core import present: ${entry.includes('libphonenumber-js/core')}`,
    `metadata chunks in the package: ${readdirSync(join(dir, 'chunks')).filter((f) => /^[a-z]{2}\.generated-/.test(f)).length}`,
  ].join('\n');
});

step('plain Node (no document, no fetch)', () => execFileSync(process.execPath, ['app.mjs'], { cwd: c }));

step('esbuild --bundle --splitting --format=esm', () => {
  const out = execFileSync(process.execPath, [
    bin('esbuild/bin/esbuild'), 'app.mjs', '--bundle', '--splitting', '--format=esm',
    '--outdir=out-esbuild', '--minify', '--platform=browser',
  ], { cwd: c });
  const files = readdirSync(join(c, 'out-esbuild'));
  const entry = readFileSync(join(c, 'out-esbuild/app.js'), 'utf8');
  return [
    String(out).trim(),
    `${files.length} output files; entry ${readFileSync(join(c, 'out-esbuild/app.js')).length} B`,
    `entry still contains no metadata: ${!entry.includes('country_calling_codes')}`,
  ].join('\n');
});

step('vite build', () => {
  const out = execFileSync(process.execPath, [bin('vite/bin/vite.js'), 'build', '--config', 'vite.config.mjs'], { cwd: c });
  const assets = readdirSync(join(c, 'out-vite/assets'));
  return `${String(out).trim()}\n${assets.length} assets emitted`;
});

step('tsc on a TS consumer (published .d.ts must resolve)', () =>
  execFileSync(process.execPath, [bin('typescript/bin/tsc'), '-p', 'tsconfig.json'], { cwd: c }));

step('tree-shaking: a consumer of another entry pays zero flag/metadata bytes', () => {
  execFileSync(process.execPath, [
    bin('esbuild/bin/esbuild'), 'other.mjs', '--bundle', '--splitting', '--format=esm',
    '--outdir=out-other', '--minify', '--platform=browser',
    '--external:lit', '--external:lit/*', '--external:@lit/context',
  ], { cwd: c });
  const bundle = execFileSync(process.execPath, ['-e', "process.stdout.write(require('node:fs').readFileSync('out-other/other.js','utf8'))"], { cwd: c }).toString();
  const leaks = ['513 342', 'country_calling_codes', 'Åland', 'metadata-loaders'].filter((s) => bundle.includes(s));
  if (leaks.length > 0) throw new Error(`leaked into the eager bundle: ${leaks.join(', ')}`);
  return `no flag SVG / no phone metadata / no loader map / no country table in out-other (${bundle.length} bytes)`;
});

// Guard rail: the published .mjs must contain only static import specifiers.
const bad = makeConsumer('bad-computed-import', { withDeps: true });
writeFileSync(
  join(bad, 'node_modules/@mintplayer/web-components/flags/index.mjs'),
  [
    'const cache = new Map();',
    'export function loadFlag(code) {',
    '  const iso2 = code.trim().toLowerCase();',
    '  const hit = cache.get(iso2);',
    '  if (hit) return hit;',
    '  const p = import(/* @vite-ignore */ `./assets/${iso2}.svg?raw`).then((m) => m.default);',
    '  return cache.set(iso2, p), p;',
    '}',
    '',
  ].join('\n'),
);
step('GUARD RAIL — computed specifier must break the esbuild consumer (FAIL above = rail holds)', () =>
  execFileSync(process.execPath, [
    bin('esbuild/bin/esbuild'), 'app.mjs', '--bundle', '--splitting', '--format=esm',
    '--outdir=out-esbuild', '--platform=browser',
  ], { cwd: bad }));

// The same guard rail on the metadata side: a computed country specifier.
const badMetadata = makeConsumer('bad-computed-metadata', { withDeps: true });
{
  const dir = join(badMetadata, 'node_modules/@mintplayer/web-components');
  const map = readdirSync(join(dir, 'chunks')).find((f) => f.startsWith('metadata-loaders.generated-'));
  writeFileSync(
    join(dir, 'chunks', map),
    [
      'const metadataLoaders = new Proxy({}, {',
      // The plausible mistake: resolve the chunk by name at runtime. esbuild has
      // no name to resolve, so it globs the directory instead of failing.
      '  get: (_, iso) => () => import(/* @vite-ignore */ `./${iso}`),',
      '  has: () => true,',
      '});',
      'export { metadataLoaders };',
      '',
    ].join('\n'),
  );
}
step('GUARD RAIL (metadata) — computed specifier globs the chunks dir (SILENT mode)', () => {
  execFileSync(process.execPath, [
    bin('esbuild/bin/esbuild'), 'app.mjs', '--bundle', '--splitting', '--format=esm',
    '--outdir=out-glob', '--platform=browser',
  ], { cwd: badMetadata });
  const good = readdirSync(join(c, 'out-esbuild')).length;
  const bad = readdirSync(join(badMetadata, 'out-glob')).length;
  const total = (dir, base) =>
    readdirSync(join(base, dir)).reduce((n, f) => n + readFileSync(join(base, dir, f)).length, 0);
  return [
    `static map:   ${good} output files, ${total('out-esbuild', c)} B total`,
    `computed map: ${bad} output files, ${total('out-glob', badMetadata)} B total`,
    bad > good
      ? `=> the computed specifier BUILT SUCCESSFULLY and dragged in ${bad - good} extra files`
      : '=> no multiplication in this layout (still broken at runtime: the glob resolved nothing)',
  ].join('\n');
});

console.log(`consumers left at ${root} for inspection.`);
