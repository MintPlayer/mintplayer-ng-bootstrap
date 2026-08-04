// S8.4 — the number the PRD actually needs: how many bytes does the LAZY CHUNK
// weigh for each metadata set, bundled and minified the way a consumer's bundler
// would produce it, importing exactly the API surface §5.5 uses.
//
//   node docs/prd/_spike-phone-input-s478/s8-bundle-size.mjs
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const scratch =
  'C:/Users/piete/AppData/Local/Temp/claude/C--Repos-mintplayer-ng-bootstrap/0674019b-b885-4f6a-bee8-ba91d4ca4a2b/scratchpad/s478/node_modules';

// Exactly what phone-core's lazy facade needs (PRD §5.5).
const API = ['AsYouType', 'isValidPhoneNumber', 'validatePhoneNumberLength', 'parsePhoneNumberFromString'];

console.log('metadata set'.padEnd(14), 'minified'.padEnd(12), 'gzip'.padEnd(10), 'brotli-ish (gzip -9)');
for (const set of ['min', 'mobile', 'max']) {
  const res = await build({
    stdin: {
      contents: `import { ${API.join(', ')} } from 'libphonenumber-js/${set}';\nexport { ${API.join(', ')} };\n`,
      resolveDir: here,
      loader: 'ts',
    },
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    write: false,
    logLevel: 'warning',
    nodePaths: [resolve(repoRoot, 'node_modules'), scratch],
  });
  const bytes = res.outputFiles[0].contents;
  console.log(
    set.padEnd(14),
    `${bytes.length}`.padEnd(12),
    `${gzipSync(bytes).length}`.padEnd(10),
    `${gzipSync(bytes, { level: 9 }).length}`,
  );
}

// And the eager cost the table adds to the main bundle.
const table = await build({
  stdin: {
    contents: `import { rawCountryData } from 'intl-tel-input/data';\nexport { rawCountryData };\n`,
    resolveDir: here,
    loader: 'ts',
  },
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  write: false,
  logLevel: 'warning',
  nodePaths: [resolve(repoRoot, 'node_modules'), scratch],
});
const t = table.outputFiles[0].contents;
console.log(`\nintl-tel-input/data (EAGER): ${t.length} minified / ${gzipSync(t).length} gzip`);
