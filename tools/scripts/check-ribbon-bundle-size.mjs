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

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from './lib/cli.mjs';
import {
  missingEntryReport,
  parseMaxBytes,
  relForDisplay,
  reportBundle,
  resolveBuiltEntry,
} from './lib/bundle-audit.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const DEFAULT_MAX_BYTES = 40 * 1024;

// ng-packagr emits one FESM per secondary entry. The ribbon entry's filename
// is namespaced by the umbrella lib name, so the actual file is something
// like `mintplayer-ng-bootstrap-ribbon.mjs` under `fesm2022/`.
export const FESM_CANDIDATES = [
  'dist/libs/mintplayer-ng-bootstrap/fesm2022/mintplayer-ng-bootstrap-ribbon.mjs',
  'dist/mintplayer-ng-bootstrap/fesm2022/mintplayer-ng-bootstrap-ribbon.mjs',
];

export const LABEL = 'check-ribbon-bundle-size';

export const BUILD_COMMAND = 'npx nx build mintplayer-ng-bootstrap';

/**
 * The guard. Exit 2 when there is no build to measure, 1 over budget, 0 within.
 */
export function main({
  argv = process.argv.slice(2),
  repoRoot = REPO_ROOT,
  log = console.log,
  error = console.error,
} = {}) {
  const maxBytes = parseMaxBytes(argv, DEFAULT_MAX_BYTES);

  const fesmPath = resolveBuiltEntry(repoRoot, FESM_CANDIDATES);
  if (!fesmPath) {
    missingEntryReport(LABEL, FESM_CANDIDATES, BUILD_COMMAND).map((line) => error(line));
    return 2;
  }

  const rel = relForDisplay(fesmPath, repoRoot);
  const { gzipBytes, lines } = reportBundle({
    label: LABEL,
    path: fesmPath,
    repoRoot,
    contents: readFileSync(fesmPath),
    maxBytes,
  });
  lines.map((line) => log(line));

  if (gzipBytes > maxBytes) {
    error(
      `\n❌ Ribbon FESM exceeds gzipped budget by ${gzipBytes - maxBytes} bytes ` +
        `(${(gzipBytes / 1024).toFixed(2)} kB > ${(maxBytes / 1024).toFixed(2)} kB).`
    );
    error('Investigate with: npx source-map-explorer ' + rel);
    return 1;
  }

  log(`✅ Within budget (${gzipBytes} / ${maxBytes} bytes).`);
  return 0;
}

runCli(import.meta.url, main);
