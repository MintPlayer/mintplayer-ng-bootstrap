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
 * Rules, checked against the built entry:
 *   - `highlight.js/lib/core` may be imported statically (8.6 KB gzip, needed
 *     to highlight anything at all).
 *   - `highlight.js/lib/common` and `highlight.js/lib/languages/*` may appear
 *     ONLY inside a dynamic `import(...)`.
 *   - Bare `highlight.js` (the full 314 KB gzip library) may not appear at all.
 *
 * Usage:
 *   node tools/scripts/check-code-snippet-hljs-lazy.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const candidates = [
  'dist/libs/mintplayer-web-components/code-snippet/index.mjs',
  'dist/libs/mintplayer-web-components/code-snippet.mjs',
];

const entry = candidates.map((p) => resolve(repoRoot, p)).find((p) => existsSync(p));
if (!entry) {
  console.error('[check-code-snippet-hljs-lazy] no built entry found. Tried:');
  for (const p of candidates) console.error('  - ' + p);
  console.error('\nBuild first:\n  npx nx build mintplayer-web-components\n');
  process.exit(2);
}

const source = readFileSync(entry, 'utf8');
const rel = entry.replace(repoRoot, '.').replace(/\\/g, '/');

/** Static ESM imports: `import … from 'x'`, `import 'x'`, `export … from 'x'`. */
const staticSpecifiers = [
  ...source.matchAll(/(?:^|[;\s}])(?:import|export)\s*(?:[^'"()]*?\bfrom\s*)?['"]([^'"]+)['"]/g),
].map((m) => m[1]);

/** Dynamic imports: `import('x')`. */
const dynamicSpecifiers = [...source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
  (m) => m[1],
);

const isHljs = (s) => s === 'highlight.js' || s.startsWith('highlight.js/');
const failures = [];

for (const spec of staticSpecifiers.filter(isHljs)) {
  if (spec === 'highlight.js/lib/core') continue;
  failures.push(
    `static import of "${spec}" — grammars must be loaded through the generated ` +
      'loader map (hljs-loaders.generated.ts), not imported at module top level.',
  );
}

for (const spec of dynamicSpecifiers.filter(isHljs)) {
  if (spec === 'highlight.js' ) {
    failures.push(
      'dynamic import of the FULL "highlight.js" library (314 KB gzip) — ' +
        'import "highlight.js/lib/common" for auto-detect instead.',
    );
  }
}

const hljsStatic = staticSpecifiers.filter(isHljs);
const hljsDynamic = dynamicSpecifiers.filter(isHljs);

console.log(`[check-code-snippet-hljs-lazy] ${rel}`);
console.log(`  raw:  ${(source.length / 1024).toFixed(2)} kB`);
console.log(`  gzip: ${(gzipSync(Buffer.from(source), { level: 9 }).length / 1024).toFixed(2)} kB`);
console.log(`  static hljs imports:  ${hljsStatic.length ? hljsStatic.join(', ') : '(none)'}`);
console.log(`  dynamic hljs imports: ${hljsDynamic.length}`);

if (failures.length) {
  console.error('\n❌ highlight.js is no longer lazily loaded:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}

// A build with no dynamic hljs import at all means the loader map was dropped
// or inlined — the guarantee is gone even though no rule above fired.
if (hljsDynamic.length === 0) {
  console.error(
    '\n❌ no dynamic highlight.js import found. The generated loader map is ' +
      'missing from the build, so no grammar can be loaded on demand.',
  );
  process.exit(1);
}

console.log('\n✅ grammars load on demand; only lib/core is static.');
