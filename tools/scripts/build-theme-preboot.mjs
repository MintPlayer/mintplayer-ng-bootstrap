#!/usr/bin/env node
/**
 * Codegen: libs/mintplayer-web-components/theming/src/preboot.ts
 *       -> libs/mintplayer-web-components/theming/bs-theme-preboot.js (gitignored build artifact)
 *
 * PRD dark-mode D5: a minified ES5 IIFE that consumers load with a blocking
 * `<script src>` in `<head>`. It is generated from the same core modules the
 * store uses, so it cannot drift from them.
 *
 * Pipeline (order is required, measured in spike A2): esbuild bundles at
 * es2015 -> `ts.transpileModule` lowers the syntax to ES5 -> esbuild minifies
 * at es5. esbuild alone at `target: 'es5'` hard-errors on const/let/for-of.
 *
 * Guards, each of which fails the build (and removes a stale output):
 *   - size <= 1024 bytes
 *   - no `import` / `export` anywhere in the output
 *   - parses with acorn as an ecmaVersion 5 SCRIPT
 * acorn checks syntax only. The runtime-API rule (no `find`, `includes`,
 * `startsWith`, ... in the modules preboot.ts pulls in) is a source rule,
 * documented in theming/src/cookie.ts.
 *
 * Run as part of `nx run mintplayer-web-components:codegen-wc`.
 */
import { build, transform } from 'esbuild';
import { parse } from 'acorn';
import ts from 'typescript';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { runCli } from './lib/cli.mjs';

const root = resolve(import.meta.dirname, '../../libs/mintplayer-web-components/theming');
export const ENTRY = resolve(root, 'src/preboot.ts');
export const OUTFILE = resolve(root, 'bs-theme-preboot.js');
export const BUDGET = 1024;

/** The three-stage pipeline: bundle at es2015, lower to ES5, minify at es5. Returns the trimmed script. */
export async function bundlePreboot(entry = ENTRY) {
  const bundled = await build({
    entryPoints: [entry],
    write: false,
    bundle: true,
    format: 'iife',
    target: 'es2015',
    platform: 'browser',
    legalComments: 'none',
    logLevel: 'warning',
  });

  const es5 = ts.transpileModule(bundled.outputFiles[0].text, {
    compilerOptions: {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.None,
      removeComments: true,
    },
  }).outputText;

  const { code } = await transform(es5, { minify: true, target: 'es5', legalComments: 'none' });
  return code.trim();
}

/** Why `output` must not ship, or null when it passes every guard. */
export function validatePreboot(output, budget = BUDGET) {
  const bytes = Buffer.byteLength(output);
  if (bytes > budget) return `${bytes} B exceeds the ${budget} B budget`;
  if (/\b(?:import|export)\b/.test(output)) return 'output contains import/export (module syntax leaked into the IIFE)';
  try {
    // sourceType 'script' rejects module syntax; ecmaVersion 5 rejects const/let/arrows/classes/templates.
    parse(output, { ecmaVersion: 5, sourceType: 'script' });
  } catch (error) {
    return `output does not parse as an ES5 script: ${error.message}`;
  }
  return null;
}

/**
 * Build, guard, write. A failed guard removes a stale `outfile` (so a page can
 * never load the previous, passing build by accident) and exits 1.
 */
export async function main({
  entry = ENTRY,
  outfile = OUTFILE,
  budget = BUDGET,
  bundle = bundlePreboot,
  log = console.log,
  error = console.error,
} = {}) {
  const output = await bundle(entry);
  const problem = validatePreboot(output, budget);
  if (problem) {
    if (existsSync(outfile)) rmSync(outfile);
    error(`build-theme-preboot: ${problem}`);
    return 1;
  }

  writeFileSync(outfile, output + '\n');
  log(`build-theme-preboot: wrote ${outfile} (${Buffer.byteLength(output)} B, budget ${budget} B)`);
  return 0;
}

runCli(import.meta.url, main);
