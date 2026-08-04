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
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
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

step('plain Node (no document, no fetch)', () => execFileSync(process.execPath, ['app.mjs'], { cwd: c }));

step('esbuild --bundle --splitting --format=esm', () =>
  execFileSync(process.execPath, [
    bin('esbuild/bin/esbuild'), 'app.mjs', '--bundle', '--splitting', '--format=esm',
    '--outdir=out-esbuild', '--minify', '--platform=browser',
  ], { cwd: c }));

step('vite build', () =>
  execFileSync(process.execPath, [bin('vite/bin/vite.js'), 'build', '--config', 'vite.config.mjs'], { cwd: c }));

step('tsc on a TS consumer (published .d.ts must resolve)', () =>
  execFileSync(process.execPath, [bin('typescript/bin/tsc'), '-p', 'tsconfig.json'], { cwd: c }));

step('tree-shaking: a consumer of another entry pays zero flag/metadata bytes', () => {
  execFileSync(process.execPath, [
    bin('esbuild/bin/esbuild'), 'other.mjs', '--bundle', '--splitting', '--format=esm',
    '--outdir=out-other', '--minify', '--platform=browser',
    '--external:lit', '--external:lit/*', '--external:@lit/context',
  ], { cwd: c });
  const bundle = execFileSync(process.execPath, ['-e', "process.stdout.write(require('node:fs').readFileSync('out-other/other.js','utf8'))"], { cwd: c }).toString();
  const leaks = ['513 342', 'country_calling_codes', 'Åland'].filter((s) => bundle.includes(s));
  if (leaks.length > 0) throw new Error(`leaked into the eager bundle: ${leaks.join(', ')}`);
  return `no flag SVG / no phone metadata / no country table in out-other (${bundle.length} bytes)`;
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

console.log(`consumers left at ${root} for inspection.`);
