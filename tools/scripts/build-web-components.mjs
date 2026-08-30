#!/usr/bin/env node
/**
 * Web-component codegen for Lit.
 *
 * Two patterns:
 *
 * 1. Element templates — for every `<name>.element.html` under a web-components/
 *    folder, reads the sibling `<name>.element.scss`, compiles it, and emits
 *    `<name>.element.template.ts` with two exports:
 *      - `template`  — a static Lit `html\`...\`` TemplateResult
 *      - `styles`    — a Lit CSSResult (via `unsafeCSS`) of the compiled SCSS
 *
 * 2. Styles-only — for every `<name>.styles.scss` anywhere under the libRoot,
 *    compiles it and emits `<name>.styles.ts` with one export:
 *      - `<camelCaseBasename>Styles` — a Lit CSSResult
 *
 * Idempotent: skips writes when generated content is byte-identical, so Nx
 * cache stays warm and git stays clean.
 *
 * Side-effect-free on import: argv validation and the CLI work sit behind an
 * isEntryPoint guard, and every path constant is a defaulted parameter, so a
 * spec can drive the pieces against a temp tree without touching the workspace.
 *
 * Usage:
 *   node tools/scripts/build-web-components.mjs <libRoot> [<libRoot> ...]
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as sass from 'sass';
import chokidar from 'chokidar';
import {
  buildElementTemplateModule,
  buildStylesModule,
  toCamelCase,
  writeIfChanged,
} from './lib/wc-codegen.mjs';
import { rescopeCss } from './lib/rescope-css.mjs';

export const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

/** Split argv into the `--watch` flag and the libRoot positionals. */
export function parseArgs(argv) {
  return {
    watchMode: argv.includes('--watch'),
    libRoots: argv.filter((a) => a !== '--watch'),
  };
}

export async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

export async function findFiles(libRoot, predicate, repoRoot = REPO_ROOT) {
  const matches = [];
  const absRoot = resolve(repoRoot, libRoot);
  for await (const file of walk(absRoot)) {
    if (predicate(file)) matches.push(file);
  }
  return matches;
}

// Any `<name>.element.html` under a libRoot. The libRoot is the scope —
// pre-extraction this also required a `web-components/` path segment
// because the WCs lived inside `libs/mintplayer-ng-bootstrap/.../web-components/`;
// post-extraction the WCs are at `libs/mintplayer-web-components/...` and
// the segment no longer exists, so we rely on the libRoot argument instead.
export const isElementHtml = (file) => file.endsWith('.element.html');

export const isStylesScss = (file) => file.endsWith('.styles.scss');

// Light-tier stylesheets (docs/prd/wc-style-encapsulation.md §L4): the file
// name carries the scope — `badge.light.scss` → scope `badge`, host tag
// `mp-badge`, output `badge.light.styles.ts` exporting `badgeLightStyles`.
export const isLightScss = (file) => file.endsWith('.light.scss');

/** Path separators normalised to posix, so generated headers are identical on every OS. */
export const toPosix = (p) => p.replace(/\\/g, '/');

// Bootstrap 5.3.x's SCSS triggers these Sass 3.0 deprecations (`@import`,
// `mix()`/global builtins, `red()`/`green()`/`blue()`, `if()`, the legacy
// JS API). Upstream's fix PR (twbs/bootstrap#41112) was closed without
// merging; the cleanup landed only on v6-dev as part of a full rewrite.
// Drop this `silenceDeprecations` array when bumping bootstrap to v6.
const BOOTSTRAP_SILENCED_DEPRECATIONS = [
  'import',
  'global-builtin',
  'color-functions',
  'if-function',
  'legacy-js-api',
];

export function compileScss(scssPath, repoRoot = REPO_ROOT) {
  const result = sass.compile(scssPath, {
    style: 'expanded',
    sourceMap: false,
    // repoRoot first → matches the workspace-relative paths VS Code Ctrl+click
    // resolves (e.g. `@import "node_modules/bootstrap/scss/functions"`).
    // node_modules second → also accepts the bare `bootstrap/scss/...` form
    // used by the published `_bootstrap.scss`.
    loadPaths: [dirname(scssPath), repoRoot, join(repoRoot, 'node_modules')],
    silenceDeprecations: BOOTSTRAP_SILENCED_DEPRECATIONS,
  });
  return result.css;
}

export async function processElement(htmlPath, repoRoot = REPO_ROOT) {
  const dir = dirname(htmlPath);
  const base = basename(htmlPath, '.element.html');
  const scssPath = join(dir, `${base}.element.scss`);
  const outPath = join(dir, `${base}.element.template.ts`);

  if (!existsSync(scssPath)) {
    throw new Error(
      `${relative(repoRoot, htmlPath)}: missing sibling ${base}.element.scss`,
    );
  }

  const html = (await readFile(htmlPath, 'utf8')).trimEnd();
  const css = compileScss(scssPath, repoRoot).trimEnd();
  const next = buildElementTemplateModule({
    css,
    html,
    sourceHtmlRel: toPosix(relative(dir, htmlPath)),
    sourceScssRel: toPosix(relative(dir, scssPath)),
  });

  return { outPath, changed: await writeIfChanged(outPath, next) };
}

export async function processStyles(scssPath, repoRoot = REPO_ROOT) {
  const dir = dirname(scssPath);
  const base = basename(scssPath, '.styles.scss');
  const outPath = join(dir, `${base}.styles.ts`);
  const exportName = `${toCamelCase(base)}Styles`;

  const css = compileScss(scssPath, repoRoot).trimEnd();
  const next = buildStylesModule({
    css,
    sourceScssRel: toPosix(relative(dir, scssPath)),
    exportName,
  });

  return { outPath, changed: await writeIfChanged(outPath, next) };
}

export async function processLightStyles(scssPath, repoRoot = REPO_ROOT) {
  const dir = dirname(scssPath);
  const base = basename(scssPath, '.light.scss');
  const outPath = join(dir, `${base}.light.styles.ts`);
  // Tolerate an `mp-` prefix in the file name; the scope never carries it.
  const scope = base.replace(/^mp-/, '');
  const exportName = `${toCamelCase(scope)}LightStyles`;

  const css = rescopeCss(compileScss(scssPath, repoRoot).trimEnd(), { scope });
  const next = buildStylesModule({
    css,
    sourceScssRel: toPosix(relative(dir, scssPath)),
    exportName,
  });

  return { outPath, changed: await writeIfChanged(outPath, next) };
}

export async function runOnce(libRoots, repoRoot = REPO_ROOT) {
  const elementHtml = [];
  const stylesScss = [];
  const lightScss = [];

  for (const libRoot of libRoots) {
    elementHtml.push(...(await findFiles(libRoot, isElementHtml, repoRoot)));
    stylesScss.push(...(await findFiles(libRoot, isStylesScss, repoRoot)));
    lightScss.push(...(await findFiles(libRoot, isLightScss, repoRoot)));
  }

  if (elementHtml.length === 0 && stylesScss.length === 0 && lightScss.length === 0) {
    console.log('build-web-components: no inputs found, nothing to do.');
    return { total: 0, changedCount: 0 };
  }

  let changedCount = 0;
  for (const html of elementHtml) {
    const { outPath, changed } = await processElement(html, repoRoot);
    const rel = toPosix(relative(repoRoot, outPath));
    console.log(`${changed ? 'wrote   ' : 'skipped '} ${rel}`);
    if (changed) changedCount++;
  }
  for (const scss of stylesScss) {
    const { outPath, changed } = await processStyles(scss, repoRoot);
    const rel = toPosix(relative(repoRoot, outPath));
    console.log(`${changed ? 'wrote   ' : 'skipped '} ${rel}`);
    if (changed) changedCount++;
  }
  for (const scss of lightScss) {
    const { outPath, changed } = await processLightStyles(scss, repoRoot);
    const rel = toPosix(relative(repoRoot, outPath));
    console.log(`${changed ? 'wrote   ' : 'skipped '} ${rel}`);
    if (changed) changedCount++;
  }

  const total = elementHtml.length + stylesScss.length + lightScss.length;
  console.log(
    `build-web-components: ${total} input(s) processed, ${changedCount} written.`,
  );
  return { total, changedCount };
}

function startWatchers(libRoots, repoRoot = REPO_ROOT) {
  // SCSS @import graph means any *.scss can affect compiled output (e.g. a
  // shared mixin under src/styles/). Watch every .scss + .html under each
  // libRoot, then filter by suffix so non-codegen edits don't trigger work.
  const matters = (file) =>
    !!file &&
    (file.endsWith('.element.html') ||
      file.endsWith('.element.scss') ||
      file.endsWith('.scss'));

  let timer = null;
  let inFlight = false;
  let dirty = false;

  const flush = async () => {
    if (inFlight) { dirty = true; return; }
    inFlight = true;
    dirty = false;
    try {
      await runOnce(libRoots, repoRoot);
    } catch (err) {
      console.error(err.stack ?? err);
    } finally {
      inFlight = false;
      if (dirty) schedule();
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 150);
  };

  // Use chokidar instead of `fs.watch({ recursive: true })`: Node's recursive
  // watch is only supported on macOS and Windows and throws
  // ERR_FEATURE_UNAVAILABLE_ON_PLATFORM on Linux, which would crash the
  // sidecar and (via `concurrently -k`) take `nx serve` down with it.
  const watchPaths = libRoots.map((r) => resolve(repoRoot, r));
  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\\/])(node_modules|\..+)/,
    ignoreInitial: true,
    persistent: true,
  });

  watcher.on('all', (_event, filepath) => {
    if (!matters(filepath)) return;
    const rel = toPosix(relative(repoRoot, filepath));
    console.log(`build-web-components: change — ${rel}`);
    schedule();
  });
}

async function main(argv = process.argv.slice(2), repoRoot = REPO_ROOT) {
  const { watchMode, libRoots } = parseArgs(argv);

  if (libRoots.length === 0) {
    console.error('build-web-components: at least one <libRoot> argument is required');
    process.exit(1);
  }

  await runOnce(libRoots, repoRoot);
  if (watchMode) {
    console.log('build-web-components: watching for changes (Ctrl+C to stop)...');
    startWatchers(libRoots, repoRoot);
  }
}

const isEntryPoint = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  main().catch((err) => {
    console.error(err.stack ?? err);
    process.exit(1);
  });
}
