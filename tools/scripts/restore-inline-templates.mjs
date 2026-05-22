#!/usr/bin/env node
/**
 * One-shot helper: for each pre-existing Angular component whose inline
 * `template: \`…\`` block was extracted to a sibling .html file by this PR,
 * restore the original inline template (from origin/master) and delete the
 * generated .html file. Reduces churn in the PR.
 *
 * Usage: node tools/scripts/restore-inline-templates.mjs <list-file>
 *   <list-file>: text file with one path per line (relative to repo root)
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { argv, exit } from 'node:process';

const listPath = argv[2];
if (!listPath) {
  console.error('usage: restore-inline-templates.mjs <list-file>');
  exit(1);
}

const files = readFileSync(listPath, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

let restored = 0;
let skipped = 0;
const problems = [];

for (const tsPath of files) {
  const htmlPath = tsPath.replace(/\.ts$/, '.html');

  // Resolve master source: try same path first; on miss, try collapsing the
  // last subfolder (handles "components/foo/foo.component.ts" → flat
  // "components/foo.component.ts" renames done elsewhere in the PR).
  const masterCandidates = [tsPath];
  const m = tsPath.match(/^(.*)\/([^/]+)\/([^/]+\.component\.ts)$/);
  if (m && m[2] === m[3].replace(/\.component\.ts$/, '')) {
    masterCandidates.push(`${m[1]}/${m[3]}`);
  }
  let masterTs;
  for (const c of masterCandidates) {
    try {
      masterTs = execSync(`git show origin/master:${c}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      break;
    } catch {}
  }
  if (!masterTs) {
    problems.push(`${tsPath}: not on master (tried ${masterCandidates.join(', ')})`);
    skipped++;
    continue;
  }

  // Match inline `template:` with backtick, single-quote, or double-quote
  // delimiters. Backtick form is allowed to span multiple lines; quoted
  // forms must stay on one line (TS string literals can't contain raw \n).
  const tplMatch =
    masterTs.match(/^([ \t]*)template:\s*`([\s\S]*?)`,?[ \t]*$/m) ??
    masterTs.match(/^([ \t]*)template:\s*'(?:[^'\\]|\\.)*',?[ \t]*$/m) ??
    masterTs.match(/^([ \t]*)template:\s*"(?:[^"\\]|\\.)*",?[ \t]*$/m);
  if (!tplMatch) {
    problems.push(`${tsPath}: no inline template: \`…\` block on master`);
    skipped++;
    continue;
  }

  const masterTemplateLine = tplMatch[0];

  const headTs = readFileSync(tsPath, 'utf8');
  const urlMatch = headTs.match(/^([ \t]*)templateUrl:\s*['"][^'"]+['"],?[ \t]*$/m);
  if (!urlMatch) {
    problems.push(`${tsPath}: no templateUrl line in HEAD`);
    skipped++;
    continue;
  }

  const patched = headTs.replace(urlMatch[0], masterTemplateLine);
  if (patched === headTs) {
    problems.push(`${tsPath}: replacement was a no-op`);
    skipped++;
    continue;
  }

  writeFileSync(tsPath, patched);

  if (existsSync(htmlPath)) {
    unlinkSync(htmlPath);
  }

  restored++;
}

console.log(`restored ${restored} files, skipped ${skipped}`);
if (problems.length) {
  console.log('\nproblems:');
  problems.forEach((p) => console.log('  - ' + p));
}
