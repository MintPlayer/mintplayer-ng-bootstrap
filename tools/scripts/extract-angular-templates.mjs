#!/usr/bin/env node
/**
 * One-off script — extracts inline Angular component templates
 * (`template: \`...\``) into sibling `.html` files and rewrites the
 * decorator to use `templateUrl`.
 *
 * Input  (foo.component.ts):
 *   @Component({
 *     selector: 'bs-foo',
 *     template: `<div>hello</div>`,
 *   })
 *
 * Output (foo.component.ts):
 *   @Component({
 *     selector: 'bs-foo',
 *     templateUrl: './foo.component.html',
 *   })
 *
 * Output (foo.component.html, new file):
 *   <div>hello</div>
 *
 * Constraints:
 * - Only touches files containing `template: \``. `templateUrl:` files
 *   are left alone.
 * - Strips ONE leading newline + the dedent matching the template's
 *   inner indentation, so the extracted .html doesn't carry useless
 *   leading whitespace.
 * - Unescapes backslash-escaped backticks (`\\\`` → `` ` ``).
 * - Refuses to extract if the template contains `${` — that would be a
 *   TS-side string interpolation and the .html file can't host it.
 *   Logs a warning and skips.
 *
 * Usage: node tools/scripts/extract-angular-templates.mjs <file>...
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const TEMPLATE_RE = /(\n[ \t]*)template:\s*`([\s\S]*?)`,?/;

function dedent(s) {
  const lines = s.split('\n');
  // First line is usually right after the opening backtick (could be
  // empty or could carry content); drop a single leading empty line.
  if (lines.length > 1 && lines[0].trim() === '') lines.shift();
  // Compute the minimum indent across non-empty lines.
  const indents = lines
    .filter((l) => l.trim() !== '')
    .map((l) => (l.match(/^[ \t]*/)?.[0] ?? '').length);
  const minIndent = indents.length ? Math.min(...indents) : 0;
  // Strip that minimum from every line.
  const trimmed = lines.map((l) => l.slice(minIndent));
  // Drop a single trailing empty line (mirrors the leading drop).
  if (trimmed.length && trimmed[trimmed.length - 1].trim() === '') trimmed.pop();
  return trimmed.join('\n') + '\n';
}

function processFile(filePath) {
  const original = readFileSync(filePath, 'utf8');
  const match = original.match(TEMPLATE_RE);
  if (!match) return { changed: false, reason: 'no template' };

  const [whole, leadingWhitespace, rawTemplate] = match;

  if (rawTemplate.includes('${')) {
    return { changed: false, reason: 'contains ${} interpolation — skipped' };
  }

  // Derive sibling .html filename
  const baseName = basename(filePath, '.ts');           // foo.component
  const htmlName = `${baseName}.html`;
  const htmlPath = join(dirname(filePath), htmlName);

  if (existsSync(htmlPath)) {
    return { changed: false, reason: `${htmlName} already exists — skipped` };
  }

  // Unescape \` → ` (template literals require escaping; HTML doesn't)
  const unescaped = rawTemplate.replace(/\\`/g, '`');
  const dedented = dedent(unescaped);

  writeFileSync(htmlPath, dedented);

  // Replace `template: \`...\`,?` with `templateUrl: './foo.component.html',`
  const replacement = `${leadingWhitespace}templateUrl: './${htmlName}',`;
  const next = original.replace(TEMPLATE_RE, replacement);

  writeFileSync(filePath, next);
  return { changed: true, htmlPath };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node extract-angular-templates.mjs <file>...');
  process.exit(1);
}

let extracted = 0;
let skipped = 0;
for (const f of files) {
  const r = processFile(f);
  if (r.changed) {
    console.log(`[extracted] ${f}`);
    extracted++;
  } else {
    console.log(`[skip] ${f} — ${r.reason}`);
    skipped++;
  }
}
console.log(`\n${extracted} extracted, ${skipped} skipped.`);
