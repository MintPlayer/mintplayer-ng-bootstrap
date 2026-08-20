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
import { fileURLToPath, pathToFileURL } from 'node:url';
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

const isEntryPoint = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  const entry = resolveBuiltEntry(REPO_ROOT, ENTRY_CANDIDATES);
  if (!entry) {
    for (const line of missingEntryReport(LABEL, ENTRY_CANDIDATES, BUILD_COMMAND)) {
      console.error(line);
    }
    process.exit(2);
  }

  const source = readFileSync(entry, 'utf8');
  const { staticHljs, dynamicHljs, failures } = auditHljsImports(source);

  const { lines } = reportBundle({ label: LABEL, path: entry, repoRoot: REPO_ROOT, contents: source });
  for (const line of lines) console.log(line);
  console.log(`  static hljs imports:  ${staticHljs.length ? staticHljs.join(', ') : '(none)'}`);
  console.log(`  dynamic hljs imports: ${dynamicHljs.length}`);

  if (failures.length) {
    console.error('\n❌ highlight.js is no longer lazily loaded:');
    for (const failure of failures) console.error('  - ' + failure);
    process.exit(1);
  }

  console.log('\n✅ grammars load on demand; only lib/core is static.');
}
