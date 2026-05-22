#!/usr/bin/env node
/**
 * One-off script — finds files with multiple import statements that all
 * target the same source path and merges them into a single import.
 *
 * Phase 2's bulk path-rewrite collapsed several relative imports to the
 * same package path but left the resulting `from 'X'` lines as separate
 * statements. TS allows this but it's ugly. This merges them, preserving
 * `import type` modifiers via TS 4.5+ inline `type` syntax
 * (`{ Foo, type Bar }`).
 *
 * Constraints:
 * - Only merges imports with named bindings. Side-effect imports
 *   (`import 'foo';`) and default imports (`import X from 'foo';`) are
 *   left alone.
 * - Multi-line import blocks are handled.
 * - `import type { ... } from 'X';` and `import { ... } from 'X';` are
 *   merged into a single `import { type ..., ... } from 'X';`.
 *
 * Usage: node tools/scripts/merge-duplicate-imports.mjs <file>...
 */
import { readFileSync, writeFileSync } from 'node:fs';
const NAMED_IMPORT_RE =
  /^([ \t]*)import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+'([^']+)';?\s*$/gm;

function parseNames(rawNames, isTypeImport) {
  return rawNames
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => {
      // Detect already-typed inline import: `type Foo`
      const m = n.match(/^type\s+(.+)$/);
      const isType = isTypeImport || !!m;
      const cleanName = m ? m[1].trim() : n;
      return { name: cleanName, isType };
    });
}

function formatNames(names) {
  return names
    .map((n) => (n.isType ? `type ${n.name}` : n.name))
    .join(', ');
}

function processFile(filePath) {
  const original = readFileSync(filePath, 'utf8');
  const matches = [];
  let m;
  // Reset regex state
  NAMED_IMPORT_RE.lastIndex = 0;
  while ((m = NAMED_IMPORT_RE.exec(original)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      indent: m[1],
      isType: !!m[2],
      names: m[3],
      source: m[4],
    });
  }

  // Group by source
  const groups = new Map();
  for (const match of matches) {
    if (!groups.has(match.source)) groups.set(match.source, []);
    groups.get(match.source).push(match);
  }

  // Only act on groups with >1 entry
  const toMerge = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  if (toMerge.length === 0) return false;

  // Collect all named bindings per source (de-dup by name, keep `type` if any
  // entry was type-only — narrower error; we'd rather over-import as value)
  const merged = new Map();
  for (const [source, arr] of toMerge) {
    const seen = new Map();
    for (const entry of arr) {
      for (const n of parseNames(entry.names, entry.isType)) {
        if (!seen.has(n.name)) seen.set(n.name, n);
        // If we've seen this name as type-only but it's now a value import,
        // promote to value (drops the `type` modifier).
        else if (seen.get(n.name).isType && !n.isType) seen.set(n.name, n);
      }
    }
    merged.set(source, [...seen.values()]);
  }

  // Rebuild output: replace the first occurrence of each merged group with
  // the merged import; delete the rest.
  // Process matches in reverse order so character indices stay valid.
  let output = original;
  const replacements = [];
  for (const [source, arr] of toMerge) {
    arr.forEach((entry, idx) => {
      if (idx === 0) {
        const allNames = merged.get(source);
        const formatted = formatNames(allNames);
        // Keep multi-line shape if the line was already wrapped (heuristic:
        // >100 chars merged). Otherwise inline.
        const inline = `${entry.indent}import { ${formatted} } from '${source}';`;
        const wrapped =
          inline.length <= 100
            ? inline
            : `${entry.indent}import {\n${allNames
                .map((n) => `${entry.indent}  ${n.isType ? 'type ' : ''}${n.name},`)
                .join('\n')}\n${entry.indent}} from '${source}';`;
        replacements.push({ start: entry.start, end: entry.end, text: wrapped });
      } else {
        // Delete this import (including trailing newline if present).
        let end = entry.end;
        if (output[end] === '\n') end++;
        replacements.push({ start: entry.start, end, text: '' });
      }
    });
  }

  replacements.sort((a, b) => b.start - a.start);
  for (const r of replacements) {
    output = output.slice(0, r.start) + r.text + output.slice(r.end);
  }

  if (output !== original) {
    writeFileSync(filePath, output);
    return true;
  }
  return false;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node merge-duplicate-imports.mjs <file>...');
  process.exit(1);
}

let modified = 0;
for (const f of files) {
  const changed = processFile(f);
  if (changed) {
    console.log(`[merged] ${f}`);
    modified++;
  }
}
console.log(`\n${modified}/${files.length} files modified.`);
