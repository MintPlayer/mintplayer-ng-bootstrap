#!/usr/bin/env node
/**
 * One-off script — collapses every multi-line ESM import statement in
 * the workspace into a single line.
 *
 * Example input:
 *   import {
 *     Component,
 *     ChangeDetectionStrategy,
 *     inject,
 *   } from '@angular/core';
 *
 * Output:
 *   import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
 *
 * Handles:
 * - `import { ... } from '...';` (named bindings, possibly with `type`
 *   modifiers inline)
 * - `import type { ... } from '...';`
 * - Multi-line bindings on .ts, .tsx, .mts, .vue files
 *
 * Leaves alone:
 * - Side-effect imports (`import 'foo';`)
 * - Default imports (`import X from 'foo';`)
 * - Namespace imports (`import * as X from 'foo';`)
 * - Default + named combo (`import X, { Y } from 'foo';`) — the named
 *   block IS collapsed if multi-line; the default stays attached
 * - Anything inside Vue SFC <template> / <style> blocks (we only touch
 *   <script[...] setup?> contents in .vue files)
 *
 * Usage: node tools/scripts/collapse-multiline-imports.mjs <dir-or-file>...
 */
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
/**
 * Match any import statement (single or multi-line) that has named
 * bindings. The closing `}` and the `from 'source';` must be present.
 *
 * Capture groups:
 *   1 — leading default import + comma + whitespace (e.g. `React, `)
 *       or empty for pure-named imports
 *   2 — `type ` (optional, before the `{`)
 *   3 — the names inside `{ ... }`
 *   4 — the source string
 */
const IMPORT_RE =
  /^([ \t]*)import\s+(?:([A-Za-z_$][\w$]*)\s*,\s*)?(type\s+)?\{([\s\S]*?)\}\s+from\s+'([^']+)';?\s*$/gm;

function collapseInScript(scriptText) {
  return scriptText.replace(IMPORT_RE, (match, indent, defaultBinding, typeKw, names, source) => {
    // Normalise the names list: split on commas, trim each, drop empties
    // (handles trailing comma).
    const parts = names
      .split(/,(?![^<]*>)/)  // naive comma split — fine for import lists (no generics)
      .map((s) => s.trim())
      .filter(Boolean);
    const joined = parts.join(', ');
    const defaultPart = defaultBinding ? `${defaultBinding}, ` : '';
    const typePart = typeKw ? 'type ' : '';
    return `${indent}import ${defaultPart}${typePart}{ ${joined} } from '${source}';`;
  });
}

function processVue(content) {
  // Only collapse imports inside <script[...]>...</script> blocks. Each
  // <script> block is processed independently.
  return content.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g, (m, open, body, close) => {
    return open + collapseInScript(body) + close;
  });
}

function processFile(filePath) {
  const original = readFileSync(filePath, 'utf8');
  const ext = extname(filePath);
  let next;
  if (ext === '.vue') next = processVue(original);
  else next = collapseInScript(original);
  if (next !== original) {
    writeFileSync(filePath, next);
    return true;
  }
  return false;
}

const VALID_EXTS = new Set(['.ts', '.tsx', '.mts', '.cts', '.vue', '.mjs', '.cjs', '.js', '.jsx']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.nx', '.angular', 'coverage', '.vite', 'tmp']);

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.vscode') continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (VALID_EXTS.has(extname(e.name))) yield full;
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node collapse-multiline-imports.mjs <dir-or-file>...');
  process.exit(1);
}

let total = 0;
let modified = 0;
for (const arg of args) {
  let isFile = false;
  try { isFile = statSync(arg).isFile(); } catch { /* ignore */ }
  const targets = isFile ? [arg] : [...walk(arg)];
  for (const f of targets) {
    total++;
    if (processFile(f)) {
      modified++;
      console.log(`[collapsed] ${f}`);
    }
  }
}
console.log(`\n${modified}/${total} files modified.`);
