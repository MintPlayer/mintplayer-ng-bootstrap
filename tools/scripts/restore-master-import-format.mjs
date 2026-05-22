#!/usr/bin/env node
/**
 * For each modified .ts/.tsx file, restore master's import-block FORMAT
 * (multi-line vs single-line) and surrounding blank lines, without
 * touching any actual code logic. Specifically:
 *
 *   - If master had `import { … } from 'X';` written on multiple lines
 *     and HEAD has the same identifier set + same path but on one line,
 *     restore master's multi-line wrapping verbatim.
 *   - If master had a blank line between two imports (or after the last
 *     import) and HEAD removed it, restore that blank line.
 *
 * Items or path changed → not touched. The goal is to remove diff churn
 * from a previous collapse-script pass without changing what's imported.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { argv } from 'node:process';

// Tokenise an import statement into { kind, type, items, path, raw }.
function parseImport(text) {
  // Side-effect import: `import 'x';` — keep as a single token.
  const sideEffect = text.match(/^import\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (sideEffect) return { kind: 'side', path: sideEffect[1] };

  const m = text.match(/^import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (!m) return null;

  const type = !!m[1];
  const items = m[2]
    .split(/,/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(','); // canonical comma-joined, order preserved
  const path = m[3];
  return { kind: 'named', type, items, path };
}

function extractImports(src) {
  // Greedy, naive: walks lines, accumulates until we hit a line that
  // terminates an import (line ending with `;` after we've seen "from").
  const lines = src.split('\n');
  const imports = [];
  let buf = null;
  let bufStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (buf === null) {
      if (/^import(\s|\{|\s+type\b)/.test(trimmed)) {
        buf = line;
        bufStart = i;
      } else {
        continue;
      }
    } else {
      buf += '\n' + line;
    }
    // Termination: line ends with `;` and we already have an `import`
    // statement that contains either `from` or is a side-effect import.
    if (/;\s*$/.test(line)) {
      const parsed = parseImport(buf);
      if (parsed) {
        const isMultiline = buf.includes('\n');
        imports.push({
          startLine: bufStart,
          endLine: i,
          raw: buf,
          multiline: isMultiline,
          ...parsed,
        });
      }
      buf = null;
      bufStart = -1;
    }
  }
  return imports;
}

function importKey(imp) {
  if (imp.kind === 'side') return `side:${imp.path}`;
  return `named:${imp.type ? 'T:' : ''}${imp.items}|${imp.path}`;
}

function tryRestore(masterSrc, headSrc) {
  const masterImports = extractImports(masterSrc);
  const headImports = extractImports(headSrc);

  // Map master imports by key for lookup.
  const masterByKey = new Map(masterImports.map((i) => [importKey(i), i]));

  // Build a replacement plan: for each HEAD import where master has a
  // multi-line equivalent (same key), substitute master's raw form.
  const replacements = [];
  for (const h of headImports) {
    const key = importKey(h);
    const masterMatch = masterByKey.get(key);
    if (!masterMatch) continue;
    if (!masterMatch.multiline) continue;
    if (h.raw === masterMatch.raw) continue; // already match
    replacements.push({ from: h.raw, to: masterMatch.raw });
  }

  if (replacements.length === 0) return null;

  let out = headSrc;
  for (const r of replacements) {
    const idx = out.indexOf(r.from);
    if (idx === -1) continue;
    out = out.slice(0, idx) + r.to + out.slice(idx + r.from.length);
  }
  return out !== headSrc ? out : null;
}

// Insert a blank line after the LAST import statement in HEAD if master
// had one there and HEAD doesn't. Handles the "missing blank line before
// @Component" pattern when the surrounding import lines themselves differ
// (so exact-prev/next matching from restoreBlankLines() can't catch it).
function restoreTrailingImportBlank(masterSrc, headSrc) {
  const masterLines = masterSrc.replace(/\r\n/g, '\n').split('\n');
  const headLines = headSrc.replace(/\r\n/g, '\n').split('\n');

  const findLastImportLine = (lines) => {
    let last = -1;
    let inside = false;
    let startedAt = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!inside) {
        if (/^\s*import\b/.test(line)) {
          inside = true;
          startedAt = i;
          if (/;\s*$/.test(line)) {
            last = i;
            inside = false;
          }
        } else if (line.trim() === '' || line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
          continue; // tolerate blank/comment lines between imports
        } else {
          // Hit first non-import, non-blank, non-comment line → stop.
          break;
        }
      } else {
        if (/;\s*$/.test(line)) {
          last = i;
          inside = false;
        }
      }
    }
    return last;
  };

  const masterLast = findLastImportLine(masterLines);
  const headLast = findLastImportLine(headLines);
  if (masterLast === -1 || headLast === -1) return null;

  const masterHasBlankAfter =
    masterLast + 1 < masterLines.length && masterLines[masterLast + 1].trim() === '';
  const headHasBlankAfter =
    headLast + 1 < headLines.length && headLines[headLast + 1].trim() === '';

  if (!masterHasBlankAfter || headHasBlankAfter) return null;

  const out = [...headLines];
  out.splice(headLast + 1, 0, '');
  const eol = headSrc.includes('\r\n') ? '\r\n' : '\n';
  return out.join(eol);
}

// Restore blank lines that master had between import lines or right
// after the last import, where the surrounding non-blank lines match.
function restoreBlankLines(masterSrc, headSrc) {
  const masterLines = masterSrc.replace(/\r\n/g, '\n').split('\n');
  const headLines = headSrc.replace(/\r\n/g, '\n').split('\n');

  // For each blank line in master, check if the preceding and following
  // non-blank lines exist consecutively in HEAD (no blank between). If
  // so, splice a blank line into HEAD between them.
  const masterBlanks = [];
  for (let i = 1; i < masterLines.length - 1; i++) {
    if (masterLines[i].trim() === '' && masterLines[i - 1].trim() !== '' && masterLines[i + 1].trim() !== '') {
      masterBlanks.push({ prev: masterLines[i - 1], next: masterLines[i + 1] });
    }
  }

  if (masterBlanks.length === 0) return null;

  const result = [...headLines];
  let inserts = 0;
  for (const { prev, next } of masterBlanks) {
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i] === prev && result[i + 1] === next) {
        result.splice(i + 1, 0, '');
        inserts++;
        break;
      }
    }
  }
  if (inserts === 0) return null;
  // Preserve original CRLF if HEAD used it.
  const eol = headSrc.includes('\r\n') ? '\r\n' : '\n';
  return result.join(eol);
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
    .filter((f) => /\.(ts|tsx|js|mjs|cjs)$/.test(f));
}

let touchedFiles = 0;
let totalImportRestores = 0;
let totalBlankRestores = 0;

for (const f of files) {
  let masterSrc, headSrc;
  try {
    masterSrc = execSync(`git show origin/master:${f}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  } catch {
    continue;
  }
  headSrc = readFileSync(f, 'utf8');

  let changed = false;
  let next = headSrc;

  const afterImports = tryRestore(masterSrc, next);
  if (afterImports !== null) {
    next = afterImports;
    totalImportRestores++;
    changed = true;
  }

  const afterBlanks = restoreBlankLines(masterSrc, next);
  if (afterBlanks !== null) {
    next = afterBlanks;
    totalBlankRestores++;
    changed = true;
  }

  const afterTrailingBlank = restoreTrailingImportBlank(masterSrc, next);
  if (afterTrailingBlank !== null) {
    next = afterTrailingBlank;
    totalBlankRestores++;
    changed = true;
  }

  if (changed) {
    writeFileSync(f, next);
    touchedFiles++;
    console.log('touched:', f);
  }
}

console.log(`\ntouched ${touchedFiles} files (${totalImportRestores} import-format restores, ${totalBlankRestores} blank-line restores)`);
