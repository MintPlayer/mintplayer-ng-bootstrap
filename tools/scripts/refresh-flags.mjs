#!/usr/bin/env node
/**
 * Vendor the 3x2 SVG flags used by `@mintplayer/web-components/flags`.
 *
 * `country-flag-icons` is the *source*, and deliberately NOT a dependency of any
 * kind: it weighs 12 MB / 3,799 files, nothing else in the workspace reads it, and
 * a once-a-year refresh is not worth putting that in every contributor's and every
 * CI run's install. This script fetches the pinned version on demand instead (or
 * reuses an existing node_modules copy if one happens to be there).
 *
 * The SVGs themselves ARE committed, like any other authored input: the build then
 * needs no network and no extra package, and — because we redistribute the artwork
 * inside our published chunks — a flag change arrives as a reviewable diff rather
 * than silently on an upstream bump.
 *
 * The set of flags to vendor is derived from `intl-tel-input/data` — the same
 * table `phone-core` selects countries from — so the two can never drift into
 * a country with a dial code but no flag (or a flag nothing can pick).
 *
 * Side-effect-free on import: argv parsing and the CLI work sit behind an
 * isEntryPoint guard, and every path is a defaulted parameter.
 *
 * Usage:
 *   node tools/scripts/refresh-flags.mjs               # all dial-code countries
 *   node tools/scripts/refresh-flags.mjs --only=be,fr  # subset; skips pruning
 */

import { readFile, mkdir, readdir, unlink, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rawCountryData } from 'intl-tel-input/data';
import { writeIfChanged } from './lib/wc-codegen.mjs';

export const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

/** Pinned deliberately: a refresh should be an intentional, reviewable bump. */
const SOURCE_PKG = 'country-flag-icons';
const SOURCE_VERSION = '1.6.20';

export function flagPaths(repoRoot = REPO_ROOT) {
  const flagsRoot = join(repoRoot, 'libs/mintplayer-web-components/flags');
  return { flagsRoot, assetsDir: join(flagsRoot, 'src/assets') };
}

/**
 * The `--only=` subset, lowercased and de-blanked, or null when absent —
 * null means "full refresh", which is the only mode allowed to prune.
 */
export function parseOnly(argv) {
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  return onlyArg
    ? new Set(onlyArg.slice('--only='.length).split(',').map((c) => c.trim().toLowerCase()).filter(Boolean))
    : null;
}

export async function buildReadme({ version, license }, licensePathArg) {
  const notice = (await readFile(licensePathArg, 'utf8')).trim();
  return [
    '# `@mintplayer/web-components/flags`',
    '',
    'Lazily-loaded 3x2 SVG country flags, in two shapes: the whole corpus as one',
    'chunk, or one chunk per flag. **Pick by how many flags you show, not by taste** —',
    'the difference is measured and large.',
    '',
    '```ts',
    "import { loadAllFlags, loadFlag } from '@mintplayer/web-components/flags';",
    '',
    '// Many flags at once (a country picker): ONE request, ~43 KB gzip.',
    'const flags = await loadAllFlags();',
    "flags['be']; // string | undefined",
    '',
    '// A handful of specific flags: one ~350 B gzip chunk each.',
    "const svg = await loadFlag('be'); // string | undefined",
    '```',
    '',
    'Both are cached and neither ever rejects: an unknown code, and a chunk that',
    'failed to load, read as `undefined`.',
    '',
    'Fetching all 244 as individual `loadFlag()` chunks costs **90 KB gzip and 244',
    'requests** against **43 KB and one**, plus ~50 KB of HTTP/1.1 response headers —',
    'separate chunks cannot share a compression dictionary, so splitting the corpus',
    'nearly doubles it. Measured over HTTP/1.1 at 50 ms RTT: **3.4 s** to paint a full',
    'picker against **0.27 s** (1.9 s vs 0.18 s at 20 ms, 0.55 s vs 0.28 s over HTTP/2).',
    'The two share no cache, so calling both for the same flag fetches it twice; that is',
    'the price of letting a bundler drop whichever one you do not use (verified: a',
    'consumer that only calls `loadAllFlags()` emits none of the 244 per-flag chunks).',
    '',
    '`src/assets/*.svg` are **vendored sources**, not build artifacts: they are',
    'committed, and refreshed by `node tools/scripts/refresh-flags.mjs`, which fetches',
    'the pinned `country-flag-icons` release on demand — it is deliberately not a',
    'dependency, since nothing else reads it and it weighs 12 MB.',
    '`src/flag-loaders.generated.ts` and `src/all-flags.generated.ts` are gitignored',
    'artifacts produced by the `codegen-wc` Nx target.',
    '',
    '## License of the vendored artwork',
    '',
    `The SVGs are taken verbatim from [country-flag-icons](https://www.npmjs.com/package/country-flag-icons) v${version}, which is ${license}-licensed:`,
    '',
    '```',
    notice,
    '```',
    '',
  ].join('\n');
}

/**
 * The source package, extracted somewhere readable — reusing a node_modules copy
 * if present, otherwise `npm pack` into a temp dir. Returns the directory and a
 * cleanup callback.
 *
 * `npm pack` rather than `npm install`: it touches neither the lockfile nor
 * node_modules, so running a refresh cannot perturb the workspace.
 */
async function resolveSource(repoRoot = REPO_ROOT) {
  const local = join(repoRoot, 'node_modules', SOURCE_PKG);
  if (existsSync(join(local, '3x2'))) {
    return { dir: local, cleanup: async () => {} };
  }

  const scratch = join(tmpdir(), `mp-refresh-flags-${process.pid}`);
  await mkdir(scratch, { recursive: true });
  console.log(`refresh-flags: fetching ${SOURCE_PKG}@${SOURCE_VERSION} (not installed; needs network)…`);
  // `npm.cmd` explicitly rather than `shell: true`, which Node deprecates for
  // argument-passing (DEP0190) because the args are concatenated unescaped.
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const tgz = execFileSync(
    npm,
    ['pack', `${SOURCE_PKG}@${SOURCE_VERSION}`, '--pack-destination', scratch, '--silent'],
    { encoding: 'utf8' },
  )
    .trim()
    .split(/\r?\n/)
    .pop();
  // Extracted from INSIDE the scratch dir with a bare filename: an absolute
  // Windows path would reach GNU tar (git-bash puts it on PATH) as `C:\…`, which
  // it reads as a remote `host:path` and fails with "Cannot connect to C".
  // A relative name is unambiguous for both GNU tar and Windows' bsdtar.
  execFileSync('tar', ['-xzf', tgz], { cwd: scratch, stdio: 'inherit' });
  return { dir: join(scratch, 'package'), cleanup: () => rm(scratch, { recursive: true, force: true }) };
}

/** The dial-code countries to vendor, lowercased and sorted, narrowed by `only`. */
export function wantedCodes(countryData, only) {
  return countryData
    .map(([iso2]) => iso2.toLowerCase())
    .filter((iso2) => !only || only.has(iso2))
    .sort();
}

export async function main(argv = process.argv.slice(2), repoRoot = REPO_ROOT) {
  const only = parseOnly(argv);
  const { flagsRoot, assetsDir } = flagPaths(repoRoot);
  const { dir: packageDir, cleanup } = await resolveSource(repoRoot);
  const sourceDir = join(packageDir, '3x2');
  const licensePath = join(packageDir, 'LICENSE');
  if (!existsSync(sourceDir)) {
    console.error(`refresh-flags: ${sourceDir} missing — the fetched package looks wrong.`);
    process.exit(1);
  }

  const wanted = wantedCodes(rawCountryData, only);

  const unknown = only ? [...only].filter((c) => !wanted.includes(c)) : [];
  if (unknown.length > 0) {
    console.error(`refresh-flags: --only names non-dial-code countries: ${unknown.join(', ')}`);
    process.exit(1);
  }

  await mkdir(assetsDir, { recursive: true });

  let written = 0;
  const missing = [];
  for (const iso2 of wanted) {
    const src = join(sourceDir, `${iso2.toUpperCase()}.svg`);
    if (!existsSync(src)) {
      missing.push(iso2);
      continue;
    }
    // Copied byte-for-byte (plus a trailing newline) so an upstream bump shows
    // up as a readable diff rather than a reformat.
    const svg = `${(await readFile(src, 'utf8')).trim()}\n`;
    if (await writeIfChanged(join(assetsDir, `${iso2}.svg`), svg)) written++;
  }

  if (missing.length > 0) {
    console.error(`refresh-flags: no upstream flag for: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Only a full refresh knows the complete set, so only it may prune.
  let pruned = 0;
  if (!only) {
    const keep = new Set(wanted.map((c) => `${c}.svg`));
    for (const file of await readdir(assetsDir)) {
      if (file.endsWith('.svg') && !keep.has(file)) {
        await unlink(join(assetsDir, file));
        pruned++;
      }
    }
  }

  const pkg = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'));
  const readmeChanged = await writeIfChanged(join(flagsRoot, 'README.md'), await buildReadme(pkg, licensePath));

  await cleanup();

  console.log(
    `refresh-flags: ${wanted.length} flag(s) vendored from country-flag-icons v${pkg.version} — ` +
      `${written} written, ${pruned} pruned, README ${readmeChanged ? 'updated' : 'unchanged'}.`,
  );
}

const isEntryPoint = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  main().catch((err) => {
    console.error(err.stack ?? err);
    process.exit(1);
  });
}
