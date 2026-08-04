// Bundles the browser-side spike entries with the workspace esbuild.
// `libphonenumber-js` resolves from the spike's own scratchpad install (the repo's
// package.json is off-limits during Phase 0), so we point esbuild's node paths at it.
//
//   node docs/prd/_spike-phone-input-s478/build.mjs
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const scratch =
  'C:/Users/piete/AppData/Local/Temp/claude/C--Repos-mintplayer-ng-bootstrap/0674019b-b885-4f6a-bee8-ba91d4ca4a2b/scratchpad/s478/node_modules';

const common = {
  bundle: true,
  format: 'esm',
  target: 'es2022',
  logLevel: 'info',
  nodePaths: [resolve(repoRoot, 'node_modules'), scratch],
};

await build({
  ...common,
  entryPoints: [resolve(here, 's4-client.js')],
  outfile: resolve(here, 's4-client.bundle.js'),
});

// lit's development build is where hydration warnings live — S4.3 has to know
// whether a mismatch is even reported.
await build({
  ...common,
  entryPoints: [resolve(here, 's4-client.js')],
  outfile: resolve(here, 's4-client.dev.bundle.js'),
  conditions: ['development'],
});

await build({
  ...common,
  entryPoints: [resolve(here, 's7-caret.js')],
  outfile: resolve(here, 's7-caret.bundle.js'),
});
