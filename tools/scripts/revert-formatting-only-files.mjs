#!/usr/bin/env node
/**
 * Find files where master and HEAD differ ONLY in formatting noise
 * (multi-line import collapse, blank-line removal, trailing whitespace,
 * line-ending changes) and revert them to match master. Removes
 * pure-noise files from the PR diff without touching real changes.
 *
 * Usage: node tools/scripts/revert-formatting-only-files.mjs [<glob>...]
 *   No args → all modified files in `git diff origin/master --name-only`.
 *
 * A file is "formatting only" iff after we
 *   1. normalize line endings (CRLF → LF),
 *   2. collapse every `import { … } from '…'` statement to one line with
 *      all whitespace inside `{ … }` removed (so `{ A, B }` and `{A,B}`
 *      compare equal but `{ A, C }` vs `{ A, B }` does not),
 *   3. strip trailing whitespace from each line,
 *   4. drop blank lines,
 * the master and HEAD versions are byte-identical.
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { argv } from 'node:process';

function normalize(src) {
  let s = src.replace(/\r\n/g, '\n');
  // Collapse each multi-line `import { … } from '…';` block.
  s = s.replace(
    /import\s*(\{[\s\S]*?\})\s*from\s*(['"][^'"]+['"])\s*;?/g,
    (_m, brace, mod) => {
      const items = brace
        .replace(/[\s\n]+/g, '')
        .replace(/^\{|\}$/g, '')
        .split(',')
        .filter(Boolean)
        .join(',');
      return `import {${items}} from ${mod};`;
    },
  );
  // Also collapse `import type { … }` (same pattern, just with the `type` keyword).
  s = s.replace(
    /import\s+type\s*(\{[\s\S]*?\})\s*from\s*(['"][^'"]+['"])\s*;?/g,
    (_m, brace, mod) => {
      const items = brace
        .replace(/[\s\n]+/g, '')
        .replace(/^\{|\}$/g, '')
        .split(',')
        .filter(Boolean)
        .join(',');
      return `import type {${items}} from ${mod};`;
    },
  );
  // Per-line: strip trailing whitespace, then drop blank lines.
  return s
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .filter((l) => l.length > 0)
    .join('\n');
}

let files;
if (argv.length > 2) {
  files = argv.slice(2);
} else {
  files = execSync('git diff origin/master --name-only --diff-filter=M', {
    encoding: 'utf8',
  })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((f) => /\.(ts|tsx|js|mjs|cjs|html|scss|css|json|md)$/.test(f));
}

let reverted = 0;
let kept = 0;

for (const f of files) {
  let masterBuf, headSrc;
  try {
    masterBuf = execSync(`git show origin/master:${f}`, {
      encoding: 'buffer',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  } catch {
    kept++;
    continue;
  }
  try {
    headSrc = execSync(`git show HEAD:${f}`, { encoding: 'utf8' });
  } catch {
    kept++;
    continue;
  }
  const masterSrc = masterBuf.toString('utf8');

  if (normalize(masterSrc) === normalize(headSrc)) {
    // Write master content verbatim (preserving its original line endings).
    writeFileSync(f, masterBuf);
    reverted++;
    console.log('reverted:', f);
  } else {
    kept++;
  }
}

console.log(`\n${reverted} reverted, ${kept} kept`);
