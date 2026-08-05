// Throwaway build step for the narrow-viewport phone-input spike. Deleted before merge.
//
// Two jobs, both deliberately read-only with respect to the workspace:
//  1. SNAPSHOT `dist/libs/mintplayer-web-components` into `vendor/wc`. The spike must
//     not be at the mercy of a concurrent `nx build` from another agent, and it must
//     never trigger one.
//  2. Bundle `entry.mjs` (which imports the snapshot) with the esbuild JS API.
//     The CLI is not an option here: `--resolve-dir` does not exist, and invoking
//     `npx esbuild` through execFileSync fails on Windows.
import { build } from 'esbuild';
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const distWc = join(repo, 'dist', 'libs', 'mintplayer-web-components');
const vendor = join(here, 'vendor');

await rm(vendor, { recursive: true, force: true });
await mkdir(vendor, { recursive: true });
await cp(distWc, join(vendor, 'wc'), { recursive: true });
await cp(join(repo, 'node_modules', 'bootstrap', 'dist', 'css', 'bootstrap.min.css'), join(vendor, 'bootstrap.min.css'));
console.log('snapshotted dist -> vendor/wc');

await rm(join(here, 'bundle'), { recursive: true, force: true });
const result = await build({
  entryPoints: [join(here, 'entry.mjs')],
  bundle: true,
  format: 'esm',
  splitting: true,
  outdir: join(here, 'bundle'),
  target: 'esnext',
  absWorkingDir: here,
  nodePaths: [join(repo, 'node_modules')],
  logLevel: 'warning',
  metafile: true,
});
const chunks = Object.keys(result.metafile.outputs).length;
console.log(`bundled entry.mjs -> bundle/ (${chunks} outputs)`);

// The country label set is the input to every width measurement in this spike, so
// dump it once here for the record rather than re-deriving it per test.
const core = await readFile(join(vendor, 'wc', 'phone-core', 'index.mjs'), 'utf8').catch(() => '');
await writeFile(join(here, 'bundle', '.phone-core-bytes'), String(core.length));
