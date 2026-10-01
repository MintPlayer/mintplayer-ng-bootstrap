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

import { runCli } from './lib/cli.mjs';

export const REPO_ROOT = resolve(import.meta.dirname, '../..');
export const DEFAULT_DIST_DIR = 'dist/apps/ng-bootstrap-demo/browser';
const INDEX_NAMES = new Set(['index.csr.html', 'index.server.html', 'index.html']);

const DARK_SELECTOR = /\[data-bs-theme=(["']?)dark\1\]/;
const DARK_TOKEN = /--mp-color-mode:\s*dark/;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;

// Beasties rewrites the stylesheet link to `media="print" onload=...` when it
// inlines at build time. A template without that (index.server.html) is
// inlined per request by the SSR engine instead, so it has nothing to check.
const INLINED_AT_BUILD = /<link\b[^>]*\bmedia=["']?print["']?[^>]*\bonload=/i;

/** Index templates at the top of distDir and one level down (browser/, server/); prerendered routes are not templates. */
export function findIndexTemplates(distDir) {
  return [
    distDir,
    ...readdirSync(distDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(distDir, entry.name)),
  ].flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => INDEX_NAMES.has(name))
      .map((name) => join(dir, name)),
  );
}

/** Whether beasties inlined this template's critical CSS at build time. */
export const isInlinedAtBuild = (html) => INLINED_AT_BUILD.test(html);

/** What the inlined `<style>` blocks of `html` lack, as human-readable phrases. Empty when nothing is missing. */
export function missingDarkTokens(html) {
  const inlined = [...html.matchAll(STYLE_BLOCK)].map((match) => match[1]).join('\n');
  return [
    !DARK_SELECTOR.test(inlined) && 'a [data-bs-theme=dark] selector',
    !DARK_TOKEN.test(inlined) && 'the --mp-color-mode:dark declaration',
  ].filter(Boolean);
}

/**
 * The guard. `argv[0]` is the dist dir, workspace-relative; 1 on any failure,
 * 0 when every inlined template kept its dark tokens (or nothing was inlined).
 */
export function main({
  argv = process.argv.slice(2),
  repoRoot = REPO_ROOT,
  log = console.log,
  error = console.error,
} = {}) {
  const fail = (message) => {
    error(`check-critical-dark-tokens: ${message}`);
    return 1;
  };

  const distDir = resolve(repoRoot, argv[0] ?? DEFAULT_DIST_DIR);
  if (!existsSync(distDir)) return fail(`${distDir} does not exist; run \`nx build ng-bootstrap-demo\` first`);

  const indexFiles = findIndexTemplates(distDir);
  if (indexFiles.length === 0) return fail(`no built index template (${[...INDEX_NAMES].join(', ')}) under ${distDir}`);

  const inlinedTemplates = indexFiles
    .map((file) => ({ file, html: readFileSync(file, 'utf8') }))
    .filter(({ html }) => isInlinedAtBuild(html));

  if (inlinedTemplates.length === 0) {
    // The recorded D5c fallback (optimization.styles.inlineCritical: false): the
    // stylesheet is a plain render-blocking <link>, so there is no light-only
    // critical CSS to paint first. Nothing more to assert.
    log(
      `check-critical-dark-tokens: OK  no build-time critical CSS in ${indexFiles
        .map((file) => relative(repoRoot, file))
        .join(', ')} (inlineCritical disabled: the D5c fallback)`,
    );
    return 0;
  }

  const results = inlinedTemplates.map(({ file, html }) => ({
    file: relative(repoRoot, file),
    missing: missingDarkTokens(html),
  }));

  results
    .filter((result) => result.missing.length === 0)
    .map((result) => log(`check-critical-dark-tokens: OK  ${result.file}`));
  const failures = results.filter((result) => result.missing.length > 0);
  if (failures.length > 0) {
    return fail(
      failures
        .map((result) => `${result.file}: the inlined critical CSS lacks ${result.missing.join(' and ')}`)
        .join('\n'),
    );
  }
  return 0;
}

runCli(import.meta.url, main);
