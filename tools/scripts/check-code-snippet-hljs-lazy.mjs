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
 * (`auditHljsImports`) so they can be tested without a build — as do entry
 * resolution and the size header, which check-ribbon-bundle-size.mjs needs
 * identically. What is left here is this guard's own knowledge: where its
 * artifact may live, and what a failure reads like.
 *
 * Side-effect-free on import: everything runs behind an isEntryPoint guard, and
 * the repo root is a defaulted parameter.
 *
 * Usage:
 *   node tools/scripts/check-code-snippet-hljs-lazy.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from './lib/cli.mjs';
import {
  auditHljsImports,
  missingEntryReport,
  reportBundle,
  resolveBuiltEntry,
} from './lib/bundle-audit.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Where the built code-snippet entry may live, most-likely first. */
export const ENTRY_CANDIDATES = [
  'dist/libs/mintplayer-web-components/code-snippet/index.mjs',
  'dist/libs/mintplayer-web-components/code-snippet.mjs',
];

export const LABEL = 'check-code-snippet-hljs-lazy';

export const BUILD_COMMAND = 'npx nx build mintplayer-web-components';

/**
 * The guard. Exit 2 when there is no build to audit, 1 when highlight.js is no
 * longer lazily loaded, 0 when it is.
 */
export function main({ repoRoot = REPO_ROOT, log = console.log, error = console.error } = {}) {
  const entry = resolveBuiltEntry(repoRoot, ENTRY_CANDIDATES);
  if (!entry) {
    missingEntryReport(LABEL, ENTRY_CANDIDATES, BUILD_COMMAND).map((line) => error(line));
    return 2;
  }

  const source = readFileSync(entry, 'utf8');
  const { staticHljs, dynamicHljs, failures } = auditHljsImports(source);

  const { lines } = reportBundle({ label: LABEL, path: entry, repoRoot, contents: source });
  lines.map((line) => log(line));
  log(`  static hljs imports:  ${staticHljs.length ? staticHljs.join(', ') : '(none)'}`);
  log(`  dynamic hljs imports: ${dynamicHljs.length}`);

  if (failures.length) {
    error('\n❌ highlight.js is no longer lazily loaded:');
    failures.map((failure) => error('  - ' + failure));
    return 1;
  }

  log('\n✅ grammars load on demand; only lib/core is static.');
  return 0;
}

runCli(import.meta.url, main);
