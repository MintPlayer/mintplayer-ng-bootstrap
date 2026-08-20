#!/usr/bin/env node
// Milestone 8 — ribbon bundle-size budget. Asserts the gzipped FESM2022
// output for `@mintplayer/ng-bootstrap/ribbon` stays under the negotiated
// 40 kB target. (The PRD's original 20 kB target was set before the
// component grew to include KeyTips, Simplified layout + overflow chevron,
// RTL, FR-6 ReduceOrder, contextual tabs, Quick Access Toolbar, and slot-
// based icons. The current ~35 kB output is the post-feature-creep
// reality; consumers wanting smaller should tree-shake at the entry-point
// level by importing only the wrappers they use.)
//
// Usage:
//   node tools/scripts/check-ribbon-bundle-size.mjs            # default budget
//   node tools/scripts/check-ribbon-bundle-size.mjs --max 25000  # override
//
// Exits non-zero on:
//   - missing build artifact (with a hint to run `nx build` first)
//   - size over the budget (with the diff in bytes)
//
// Side-effect-free on import: everything runs behind an isEntryPoint guard, and
// the repo root is a defaulted parameter.

import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseMaxBytes } from './lib/bundle-audit.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const DEFAULT_MAX_BYTES = 40 * 1024;

// ng-packagr emits one FESM per secondary entry. The ribbon entry's filename
// is namespaced by the umbrella lib name, so the actual file is something
// like `mintplayer-ng-bootstrap-ribbon.mjs` under `fesm2022/`.
export const FESM_CANDIDATES = [
  'dist/libs/mintplayer-ng-bootstrap/fesm2022/mintplayer-ng-bootstrap-ribbon.mjs',
  'dist/mintplayer-ng-bootstrap/fesm2022/mintplayer-ng-bootstrap-ribbon.mjs',
];

/** The first candidate that exists, absolute — undefined when nothing is built. */
export function findFesm(repoRoot = REPO_ROOT, candidates = FESM_CANDIDATES, exists = existsSync) {
  return candidates.map((p) => resolve(repoRoot, p)).find((p) => exists(p));
}

const isEntryPoint = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  const repoRoot = REPO_ROOT;
  const maxBytes = parseMaxBytes(process.argv.slice(2), DEFAULT_MAX_BYTES);

  const fesmPath = findFesm(repoRoot);
  if (!fesmPath) {
    console.error('[check-ribbon-bundle-size] no FESM found. Tried:');
    for (const p of FESM_CANDIDATES) console.error('  - ' + p);
    console.error(
      '\nBuild the library first:\n  npx nx build mintplayer-ng-bootstrap\n'
    );
    process.exit(2);
  }

  const raw = readFileSync(fesmPath);
  const gz = gzipSync(raw, { level: 9 });
  const rawKb = (raw.length / 1024).toFixed(2);
  const gzKb = (gz.length / 1024).toFixed(2);
  const budgetKb = (maxBytes / 1024).toFixed(2);

  console.log(`[check-ribbon-bundle-size] ${fesmPath.replace(repoRoot, '.')}`);
  console.log(`  raw:  ${rawKb} kB`);
  console.log(`  gzip: ${gzKb} kB  (budget: ${budgetKb} kB)`);

  if (gz.length > maxBytes) {
    console.error(
      `\n❌ Ribbon FESM exceeds gzipped budget by ${gz.length - maxBytes} bytes ` +
        `(${gzKb} kB > ${budgetKb} kB).`
    );
    console.error(
      'Investigate with: npx source-map-explorer ' + fesmPath.replace(repoRoot, '.')
    );
    process.exit(1);
  }

  console.log(`✅ Within budget (${gz.length} / ${maxBytes} bytes).`);
}
