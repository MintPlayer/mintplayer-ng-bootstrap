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

const root = resolve(import.meta.dirname, '../../libs/mintplayer-web-components/theming');
const entry = resolve(root, 'src/preboot.ts');
const outfile = resolve(root, 'bs-theme-preboot.js');
const BUDGET = 1024;

const fail = (message) => {
  if (existsSync(outfile)) rmSync(outfile);
  console.error(`build-theme-preboot: ${message}`);
  process.exit(1);
};

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
const output = code.trim();

const bytes = Buffer.byteLength(output);
if (bytes > BUDGET) fail(`${bytes} B exceeds the ${BUDGET} B budget`);
if (/\b(?:import|export)\b/.test(output)) fail('output contains import/export (module syntax leaked into the IIFE)');
try {
  // sourceType 'script' rejects module syntax; ecmaVersion 5 rejects const/let/arrows/classes/templates.
  parse(output, { ecmaVersion: 5, sourceType: 'script' });
} catch (error) {
  fail(`output does not parse as an ES5 script: ${error.message}`);
}

writeFileSync(outfile, output + '\n');
console.log(`build-theme-preboot: wrote ${outfile} (${bytes} B, budget ${BUDGET} B)`);
