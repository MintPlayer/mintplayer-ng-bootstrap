#!/usr/bin/env node
/**
 * Guards the one guarantee that makes `<mp-code-snippet>` cheap: highlight.js
 * grammars are loaded on demand, never eagerly.
 *
 * Deliberately NOT a gzip budget like check-ribbon-bundle-size.mjs. hljs is
 * `external` in the WC build (vite.config.mts), so a regression to
 * `import hljs from 'highlight.js/lib/common'` would add a ~60-byte bare
 * specifier to the output and sail under any size budget — while costing every
 * consumer 53.7 KB gzip in THEIR bundle. Size is the wrong instrument; import
 * SHAPE is the thing to assert.
 *
 * The rules, and every judgement about them, live in lib/bundle-audit.mjs
 * (`auditHljsImports`) so they can be tested without a build. This script is the
 * part that needs `dist/`: find the entry, read it, report.
 *
 * Side-effect-free on import: everything runs behind an isEntryPoint guard, and
 * the repo root is a defaulted parameter.
 *
 * Usage:
 *   node tools/scripts/check-code-snippet-hljs-lazy.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { auditHljsImports } from './lib/bundle-audit.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Where the built code-snippet entry may live, most-likely first. */
export const ENTRY_CANDIDATES = [
  'dist/libs/mintplayer-web-components/code-snippet/index.mjs',
  'dist/libs/mintplayer-web-components/code-snippet.mjs',
];

/** The first candidate that exists, absolute — undefined when nothing is built. */
export function findEntry(repoRoot = REPO_ROOT, candidates = ENTRY_CANDIDATES, exists = existsSync) {
  return candidates.map((p) => resolve(repoRoot, p)).find((p) => exists(p));
}

/** An absolute path shown workspace-relative and posix-separated. */
export const relForDisplay = (path, repoRoot = REPO_ROOT) =>
  path.replace(repoRoot, '.').replace(/\\/g, '/');

const isEntryPoint = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  const entry = findEntry();
  if (!entry) {
    console.error('[check-code-snippet-hljs-lazy] no built entry found. Tried:');
    for (const p of ENTRY_CANDIDATES) console.error('  - ' + p);
    console.error('\nBuild first:\n  npx nx build mintplayer-web-components\n');
    process.exit(2);
  }

  const source = readFileSync(entry, 'utf8');
  const rel = relForDisplay(entry);

  const { staticHljs, dynamicHljs, failures } = auditHljsImports(source);

  console.log(`[check-code-snippet-hljs-lazy] ${rel}`);
  console.log(`  raw:  ${(source.length / 1024).toFixed(2)} kB`);
  console.log(`  gzip: ${(gzipSync(Buffer.from(source), { level: 9 }).length / 1024).toFixed(2)} kB`);
  console.log(`  static hljs imports:  ${staticHljs.length ? staticHljs.join(', ') : '(none)'}`);
  console.log(`  dynamic hljs imports: ${dynamicHljs.length}`);

  if (failures.length) {
    console.error('\n❌ highlight.js is no longer lazily loaded:');
    for (const failure of failures) console.error('  - ' + failure);
    process.exit(1);
  }

  console.log('\n✅ grammars load on demand; only lib/core is static.');
}
