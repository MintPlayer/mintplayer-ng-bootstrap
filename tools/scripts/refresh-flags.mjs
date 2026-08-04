#!/usr/bin/env node
/**
 * Vendor the 3x2 SVG flags used by `@mintplayer/web-components/flags`.
 *
 * The `country-flag-icons` devDependency is the *source*, not a runtime
 * dependency: the SVGs are copied into `flags/src/assets/` and committed like
 * any other authored input, so consumers install nothing extra and an upstream
 * bump is a script run plus a reviewable diff.
 *
 * The set of flags to vendor is derived from `intl-tel-input/data` — the same
 * table `phone-core` selects countries from — so the two can never drift into
 * a country with a dial code but no flag (or a flag nothing can pick).
 *
 * Usage:
 *   node tools/scripts/refresh-flags.mjs               # all dial-code countries
 *   node tools/scripts/refresh-flags.mjs --only=be,fr  # subset; skips pruning
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawCountryData } from 'intl-tel-input/data';

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const flagsRoot = join(repoRoot, 'libs/mintplayer-web-components/flags');
const assetsDir = join(flagsRoot, 'src/assets');
const sourceDir = join(repoRoot, 'node_modules/country-flag-icons/3x2');
const licensePath = join(repoRoot, 'node_modules/country-flag-icons/LICENSE');

const onlyArg = process.argv.slice(2).find((a) => a.startsWith('--only='));
const only = onlyArg
  ? new Set(onlyArg.slice('--only='.length).split(',').map((c) => c.trim().toLowerCase()).filter(Boolean))
  : null;

async function writeIfChanged(outPath, next) {
  const prev = existsSync(outPath) ? await readFile(outPath, 'utf8') : null;
  if (prev === next) return false;
  await writeFile(outPath, next, 'utf8');
  return true;
}

async function buildReadme({ version, license }) {
  const notice = (await readFile(licensePath, 'utf8')).trim();
  return [
    '# `@mintplayer/web-components/flags`',
    '',
    'Lazily-loaded 3x2 SVG country flags, one chunk per flag.',
    '',
    '```ts',
    "import { loadFlag } from '@mintplayer/web-components/flags';",
    '',
    "const svg = await loadFlag('be'); // string | undefined",
    '```',
    '',
    '`src/assets/*.svg` are **vendored sources**, not build artifacts: they are',
    'committed, and refreshed by `node tools/scripts/refresh-flags.mjs` from the',
    '`country-flag-icons` devDependency. `src/flag-loaders.generated.ts` is a',
    'gitignored artifact produced by the `codegen-wc` Nx target.',
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

async function main() {
  if (!existsSync(sourceDir)) {
    console.error(
      `refresh-flags: ${sourceDir} not found — install the country-flag-icons devDependency first.`,
    );
    process.exit(1);
  }

  const wanted = rawCountryData
    .map(([iso2]) => iso2.toLowerCase())
    .filter((iso2) => !only || only.has(iso2))
    .sort();

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

  const pkg = JSON.parse(await readFile(join(repoRoot, 'node_modules/country-flag-icons/package.json'), 'utf8'));
  const readmeChanged = await writeIfChanged(join(flagsRoot, 'README.md'), await buildReadme(pkg));

  console.log(
    `refresh-flags: ${wanted.length} flag(s) vendored from country-flag-icons v${pkg.version} — ` +
      `${written} written, ${pruned} pruned, README ${readmeChanged ? 'updated' : 'unchanged'}.`,
  );
}

main().catch((err) => {
  console.error(err.stack ?? err);
  process.exit(1);
});
