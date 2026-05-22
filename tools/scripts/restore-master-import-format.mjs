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
  // Tolerate leading whitespace — the same code shape shows up inside
  // dedent`…` template literals as documentation snippets.
  const trimmed = text.replace(/^\s+/, '');
  // Side-effect import: `import 'x';` — keep as a single token.
  const sideEffect = trimmed.match(/^import\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (sideEffect) return { kind: 'side', path: sideEffect[1] };

  const m = trimmed.match(/^import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+(['"][^'"]+['"])\s*;?\s*$/);
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

// Re-wrap a HEAD single-line import to multi-line using master's exact
// indentation and trailing-comma style. Substitutes the new path.
function reformatToMultiline(head, masterRaw) {
  // Pull the indent of the opening `import {` line from masterRaw.
  const firstLineIndent = (masterRaw.match(/^([ \t]*)/) ?? ['', ''])[1];
  // Pull the indent used for each item from the second non-blank line.
  const lines = masterRaw.split('\n');
  let itemIndent = '  ';
  for (let i = 1; i < lines.length; i++) {
    const m = lines[i].match(/^([ \t]+)\S/);
    if (m && !/^\s*\}/.test(lines[i])) {
      itemIndent = m[1];
      break;
    }
  }
  const items = head.items.split(',').filter(Boolean);
  const typeKeyword = head.type ? 'type ' : '';
  const inner = items.map((it) => `${itemIndent}${it},`).join('\n');
  return `${firstLineIndent}import ${typeKeyword}{\n${inner}\n${firstLineIndent}} from ${head.path};`;
}

function tryRestore(masterSrc, headSrc) {
  const masterImports = extractImports(masterSrc);
  const headImports = extractImports(headSrc);

  // Two lookups: (a) by full key for exact same-items+same-path matches,
  // (b) by items only to find master imports whose item-set matches a
  // HEAD import that landed on a different path (WC-migration rewrites).
  const masterByKey = new Map(masterImports.map((i) => [importKey(i), i]));
  const masterByItems = new Map();
  for (const m of masterImports) {
    if (m.kind === 'named' && m.multiline) {
      const k = `${m.type ? 'T' : 'N'}:${m.items}`;
      if (!masterByItems.has(k)) masterByItems.set(k, m);
    }
  }

  const replacements = [];
  for (const h of headImports) {
    if (h.kind !== 'named') continue;
    const key = importKey(h);
    const exact = masterByKey.get(key);
    if (exact) {
      if (exact.multiline && h.raw !== exact.raw) {
        replacements.push({ from: h.raw, to: exact.raw });
      }
      continue;
    }
    // No exact match. Fall back to items-only match: keep HEAD's new
    // path but adopt master's multi-line wrapping style.
    if (h.multiline) continue;
    const itemsKey = `${h.type ? 'T' : 'N'}:${h.items}`;
    const itemsMatch = masterByItems.get(itemsKey);
    if (!itemsMatch) continue;
    replacements.push({ from: h.raw, to: reformatToMultiline(h, itemsMatch.raw) });
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
  // Include renames/adds too — subfolder reorgs land as add-at-new-path.
  files = execSync('git diff origin/master --name-only --diff-filter=MAR', {
    encoding: 'utf8',
  })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((f) => /\.(ts|tsx|js|mjs|cjs)$/.test(f));
}

function masterCandidatesFor(path) {
  const candidates = [path];
  const m = path.match(/^(.*)\/([^/]+)\/([^/]+\.(?:ts|tsx|js|mjs|cjs))$/);
  if (m) {
    const base = m[3].replace(/\.(component|directive|spec|service|pipe|module)\.[^.]+$/, '');
    const sub = m[2];
    if (base === sub || m[3].startsWith(sub + '.')) {
      candidates.push(`${m[1]}/${m[3]}`);
    }
  }
  return candidates;
}

let touchedFiles = 0;
let totalImportRestores = 0;
let totalBlankRestores = 0;

for (const f of files) {
  let masterSrc, headSrc;
  for (const c of masterCandidatesFor(f)) {
    try {
      masterSrc = execSync(`git show origin/master:${c}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      break;
    } catch {}
  }
  if (!masterSrc) continue;
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
