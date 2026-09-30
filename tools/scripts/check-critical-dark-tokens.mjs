#!/usr/bin/env node
/**
 * Guard for PRD dark-mode D5c: Angular's critical-CSS inliner (beasties) must
 * keep the dark token block.
 *
 * Beasties inlines only the rules whose selectors match the STATIC index.html,
 * which carries no data-bs-theme attribute, so it prunes every
 * [data-bs-theme=dark] rule. A dark user then paints light critical CSS until
 * the async stylesheet arrives (auto, prerendered, cached and CSR pages).
 * Beasties' include markers do not survive the production CSS minifier
 * (measured), so the demo applies the recorded fallback,
 * optimization.styles.inlineCritical: false. This check keeps that honest: it
 * passes when nothing is inlined at build time, and fails when critical CSS IS
 * inlined but has lost the dark tokens (inlining re-enabled without a fix, or
 * a future Angular inliner/minifier change).
 *
 * Usage:
 *   node tools/scripts/check-critical-dark-tokens.mjs [distDir]
 *   (default distDir: dist/apps/ng-bootstrap-demo/browser)
 *
 * Checks every built index template in distDir (index.csr.html,
 * index.server.html, index.html) whose critical CSS was inlined at build time,
 * and exits non-zero when there is no index template at all, or when an
 * inlined <style> lacks a [data-bs-theme=dark] selector or the
 * --mp-color-mode:dark declaration.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const distDir = resolve(workspaceRoot, process.argv[2] ?? 'dist/apps/ng-bootstrap-demo/browser');
const INDEX_NAMES = new Set(['index.csr.html', 'index.server.html', 'index.html']);

const DARK_SELECTOR = /\[data-bs-theme=(["']?)dark\1\]/;
const DARK_TOKEN = /--mp-color-mode:\s*dark/;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;

const fail = (message) => {
  console.error(`check-critical-dark-tokens: ${message}`);
  process.exit(1);
};

if (!existsSync(distDir)) fail(`${distDir} does not exist; run \`nx build ng-bootstrap-demo\` first`);

/** Index templates at the top of distDir and one level down (browser/, server/); prerendered routes are not templates. */
const indexFiles = [distDir, ...readdirSync(distDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(distDir, entry.name))]
  .flatMap((dir) => readdirSync(dir).filter((name) => INDEX_NAMES.has(name)).map((name) => join(dir, name)));

if (indexFiles.length === 0) fail(`no built index template (${[...INDEX_NAMES].join(', ')}) under ${distDir}`);

// Beasties rewrites the stylesheet link to `media="print" onload=...` when it
// inlines at build time. A template without that (index.server.html) is
// inlined per request by the SSR engine instead, so it has nothing to check.
const INLINED_AT_BUILD = /<link\b[^>]*\bmedia=["']?print["']?[^>]*\bonload=/i;

const inlinedTemplates = indexFiles
  .map((file) => ({ file, html: readFileSync(file, 'utf8') }))
  .filter(({ html }) => INLINED_AT_BUILD.test(html));

if (inlinedTemplates.length === 0) {
  // The recorded D5c fallback (optimization.styles.inlineCritical: false): the
  // stylesheet is a plain render-blocking <link>, so there is no light-only
  // critical CSS to paint first. Nothing more to assert.
  console.log(
    `check-critical-dark-tokens: OK  no build-time critical CSS in ${indexFiles
      .map((file) => relative(workspaceRoot, file))
      .join(', ')} (inlineCritical disabled: the D5c fallback)`,
  );
  process.exit(0);
}

const results = inlinedTemplates.map(({ file, html }) => {
  const inlined = [...html.matchAll(STYLE_BLOCK)].map((match) => match[1]).join('\n');
  const missing = [
    !DARK_SELECTOR.test(inlined) && 'a [data-bs-theme=dark] selector',
    !DARK_TOKEN.test(inlined) && 'the --mp-color-mode:dark declaration',
  ].filter(Boolean);
  return { file: relative(workspaceRoot, file), missing };
});

const failures = results.filter((result) => result.missing.length > 0);
results
  .filter((result) => result.missing.length === 0)
  .map((result) => console.log(`check-critical-dark-tokens: OK  ${result.file}`));
if (failures.length > 0) {
  fail(
    failures
      .map((result) => `${result.file}: the inlined critical CSS lacks ${result.missing.join(' and ')}`)
      .join('\n'),
  );
}
