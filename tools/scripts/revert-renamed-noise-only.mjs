#!/usr/bin/env node
/**
 * For each R-status renamed file, compare master (old path) vs HEAD
 * (new path) under a whitespace-insensitive normalisation. If the
 * normalised forms are byte-identical, write master's bytes verbatim
 * to the new path so the rename carries zero whitespace churn.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';

function normalize(src) {
  let s = src.replace(/\r\n/g, '\n');
  // Collapse every `import { … } from '…';` block to one line with no
  // inner whitespace — so `{ A, B }` and `{A,B}` and multi-line all
  // compare equal. Path is kept (so a path change is detected as a
  // real diff).
  s = s.replace(
    /import\s+(type\s+)?(\{[\s\S]*?\})\s+from\s+(['"][^'"]+['"])\s*;?/g,
    (_m, typeKw, brace, mod) => {
      const items = brace
        .replace(/[\s\n]+/g, '')
        .replace(/^\{|\}$/g, '')
        .split(',')
        .filter(Boolean)
        .join(',');
      return `import ${typeKw ? 'type ' : ''}{${items}} from ${mod};`;
    },
  );
  return s
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .filter((l) => l.length > 0)
    .join('\n');
}

const lines = execSync('git diff origin/master -M50 --diff-filter=R --name-status', {
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean);

let reverted = 0;
for (const line of lines) {
  const parts = line.split('\t');
  if (parts.length !== 3) continue;
  const [, oldPath, newPath] = parts;
  if (!/\.(ts|tsx|js|mjs|cjs|html|scss|css|json|md)$/.test(newPath)) continue;
  if (!existsSync(newPath)) continue;

  let masterBuf, headSrc;
  try {
    masterBuf = execSync(`git show "origin/master:${oldPath}"`, {
      encoding: 'buffer',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  } catch {
    continue;
  }
  try {
    headSrc = execSync(`git show "HEAD:${newPath}"`, { encoding: 'utf8' });
  } catch {
    continue;
  }
  const masterSrc = masterBuf.toString('utf8');

  if (normalize(masterSrc) === normalize(headSrc)) {
    writeFileSync(newPath, masterBuf);
    reverted++;
    console.log('reverted to master bytes:', newPath);
  }
}
console.log(`\nreverted ${reverted} renamed files to master's exact bytes`);
