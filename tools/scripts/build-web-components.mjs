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
 * Usage:
 *   node tools/scripts/build-web-components.mjs <libRoot> [<libRoot> ...]
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const libRoots = process.argv.slice(2);

if (libRoots.length === 0) {
  console.error('build-web-components: at least one <libRoot> argument is required');
  process.exit(1);
}

async function* walk(dir) {
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

async function findFiles(libRoot, predicate) {
  const matches = [];
  const absRoot = resolve(repoRoot, libRoot);
  for await (const file of walk(absRoot)) {
    if (predicate(file)) matches.push(file);
  }
  return matches;
}

const isElementHtml = (file) =>
  file.endsWith('.element.html') &&
  file.split(/[\\/]/).includes('web-components');

const isStylesScss = (file) => file.endsWith('.styles.scss');

function escapeForTemplateLiteral(input) {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function compileScss(scssPath) {
  const result = sass.compile(scssPath, {
    style: 'expanded',
    sourceMap: false,
    loadPaths: [dirname(scssPath)],
  });
  return result.css;
}

function toCamelCase(kebab) {
  return kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function buildElementTemplateModule({ css, html, sourceHtmlRel, sourceScssRel }) {
  return [
    '// AUTO-GENERATED — do not edit by hand.',
    `// Source: ${sourceHtmlRel} + ${sourceScssRel}`,
    '// Regenerate with the codegen-wc Nx target.',
    '',
    "import { html, unsafeCSS } from 'lit';",
    '',
    `export const template = html\`${escapeForTemplateLiteral(html)}\`;`,
    `export const styles = unsafeCSS(\`${escapeForTemplateLiteral(css)}\`);`,
    '',
  ].join('\n');
}

function buildStylesModule({ css, sourceScssRel, exportName }) {
  return [
    '// AUTO-GENERATED — do not edit by hand.',
    `// Source: ${sourceScssRel}`,
    '// Regenerate with the codegen-wc Nx target.',
    '',
    "import { unsafeCSS } from 'lit';",
    '',
    `export const ${exportName} = unsafeCSS(\`${escapeForTemplateLiteral(css)}\`);`,
    `export default ${exportName};`,
    '',
  ].join('\n');
}

async function writeIfChanged(outPath, next) {
  let prev = null;
  if (existsSync(outPath)) prev = await readFile(outPath, 'utf8');
  if (prev === next) return false;
  await writeFile(outPath, next, 'utf8');
  return true;
}

async function processElement(htmlPath) {
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
  const css = compileScss(scssPath).trimEnd();
  const next = buildElementTemplateModule({
    css,
    html,
    sourceHtmlRel: relative(dir, htmlPath).replace(/\\/g, '/'),
    sourceScssRel: relative(dir, scssPath).replace(/\\/g, '/'),
  });

  return { outPath, changed: await writeIfChanged(outPath, next) };
}

async function processStyles(scssPath) {
  const dir = dirname(scssPath);
  const base = basename(scssPath, '.styles.scss');
  const outPath = join(dir, `${base}.styles.ts`);
  const exportName = `${toCamelCase(base)}Styles`;

  const css = compileScss(scssPath).trimEnd();
  const next = buildStylesModule({
    css,
    sourceScssRel: relative(dir, scssPath).replace(/\\/g, '/'),
    exportName,
  });

  return { outPath, changed: await writeIfChanged(outPath, next) };
}

async function main() {
  const elementHtml = [];
  const stylesScss = [];

  for (const libRoot of libRoots) {
    elementHtml.push(...(await findFiles(libRoot, isElementHtml)));
    stylesScss.push(...(await findFiles(libRoot, isStylesScss)));
  }

  if (elementHtml.length === 0 && stylesScss.length === 0) {
    console.log('build-web-components: no inputs found, nothing to do.');
    return;
  }

  let changedCount = 0;
  for (const html of elementHtml) {
    const { outPath, changed } = await processElement(html);
    const rel = relative(repoRoot, outPath).replace(/\\/g, '/');
    console.log(`${changed ? 'wrote   ' : 'skipped '} ${rel}`);
    if (changed) changedCount++;
  }
  for (const scss of stylesScss) {
    const { outPath, changed } = await processStyles(scss);
    const rel = relative(repoRoot, outPath).replace(/\\/g, '/');
    console.log(`${changed ? 'wrote   ' : 'skipped '} ${rel}`);
    if (changed) changedCount++;
  }

  const total = elementHtml.length + stylesScss.length;
  console.log(
    `build-web-components: ${total} input(s) processed, ${changedCount} written.`,
  );
}

main().catch((err) => {
  console.error(err.stack ?? err);
  process.exit(1);
});
