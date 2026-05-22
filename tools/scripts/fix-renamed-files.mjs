#!/usr/bin/env node
/**
 * Walk every R-status (renamed) entry in `git diff origin/master` and
 * restore master's surrounding whitespace inside the renamed file:
 *
 *   - multi-line `import { … } from '…'` blocks that got collapsed to
 *     a single line (items match master either by full key or items
 *     only — path may have been rewritten by the rename)
 *   - blank lines that master had between import statements / between
 *     the last import and the first non-import line
 *
 * Reuses the parsing helpers in restore-master-import-format.mjs.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

function parseImport(text) {
  const trimmed = text.replace(/^\s+/, '');
  const sideEffect = trimmed.match(/^import\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (sideEffect) return { kind: 'side', path: sideEffect[1] };

  const m = trimmed.match(/^import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (!m) return null;

  const type = !!m[1];
  const items = m[2]
    .split(/,/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(',');
  const path = m[3];
  return { kind: 'named', type, items, path };
}

function extractImports(src) {
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
      } else continue;
    } else {
      buf += '\n' + line;
    }
    if (/;\s*$/.test(line)) {
      const parsed = parseImport(buf);
      if (parsed) {
        imports.push({
          startLine: bufStart,
          endLine: i,
          raw: buf,
          multiline: buf.includes('\n'),
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

function reformatToMultiline(head, masterRaw) {
  const firstLineIndent = (masterRaw.match(/^([ \t]*)/) ?? ['', ''])[1];
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

function tryRestoreImports(masterSrc, headSrc) {
  const masterImports = extractImports(masterSrc);
  const headImports = extractImports(headSrc);
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
    const exact = masterByKey.get(importKey(h));
    if (exact) {
      if (exact.multiline && h.raw !== exact.raw) {
        replacements.push({ from: h.raw, to: exact.raw });
      }
      continue;
    }
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
    if (idx !== -1) out = out.slice(0, idx) + r.to + out.slice(idx + r.from.length);
  }
  return out !== headSrc ? out : null;
}

function restoreBlankLines(masterSrc, headSrc) {
  const masterLines = masterSrc.replace(/\r\n/g, '\n').split('\n');
  const headLines = headSrc.replace(/\r\n/g, '\n').split('\n');
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
  const eol = headSrc.includes('\r\n') ? '\r\n' : '\n';
  return result.join(eol);
}

function restoreTrailingImportBlank(masterSrc, headSrc) {
  const masterLines = masterSrc.replace(/\r\n/g, '\n').split('\n');
  const headLines = headSrc.replace(/\r\n/g, '\n').split('\n');
  const findLast = (lines) => {
    let last = -1;
    let inside = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!inside) {
        if (/^\s*import\b/.test(line)) {
          inside = true;
          if (/;\s*$/.test(line)) { last = i; inside = false; }
        } else if (line.trim() === '' || line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) continue;
        else break;
      } else if (/;\s*$/.test(line)) { last = i; inside = false; }
    }
    return last;
  };
  const ml = findLast(masterLines);
  const hl = findLast(headLines);
  if (ml === -1 || hl === -1) return null;
  const mb = ml + 1 < masterLines.length && masterLines[ml + 1].trim() === '';
  const hb = hl + 1 < headLines.length && headLines[hl + 1].trim() === '';
  if (!mb || hb) return null;
  const out = [...headLines];
  out.splice(hl + 1, 0, '');
  const eol = headSrc.includes('\r\n') ? '\r\n' : '\n';
  return out.join(eol);
}

// ── Main: walk all R-status renames ──────────────────────────────────────────
const lines = execSync('git diff origin/master -M50 --diff-filter=R --name-status', {
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean);

let touched = 0;
let totalImp = 0;
let totalBlank = 0;
let totalTrailingBlank = 0;

for (const line of lines) {
  // Format: "R099\toldpath\tnewpath"
  const parts = line.split('\t');
  if (parts.length !== 3) continue;
  const [, oldPath, newPath] = parts;
  if (!/\.(ts|tsx|js|mjs|cjs)$/.test(newPath)) continue;
  if (!existsSync(newPath)) continue;

  let masterSrc;
  try {
    masterSrc = execSync(`git show "origin/master:${oldPath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  } catch {
    continue;
  }
  const headSrc = readFileSync(newPath, 'utf8');

  let next = headSrc;
  let fileChanged = false;
  let impHit = 0, blankHit = 0, trailHit = 0;

  const a = tryRestoreImports(masterSrc, next);
  if (a !== null) { next = a; fileChanged = true; impHit = 1; }

  const b = restoreBlankLines(masterSrc, next);
  if (b !== null) { next = b; fileChanged = true; blankHit = 1; }

  const c = restoreTrailingImportBlank(masterSrc, next);
  if (c !== null) { next = c; fileChanged = true; trailHit = 1; }

  if (fileChanged) {
    writeFileSync(newPath, next);
    touched++;
    totalImp += impHit;
    totalBlank += blankHit;
    totalTrailingBlank += trailHit;
    console.log(`fixed: ${newPath}`);
  }
}

console.log(`\ntouched ${touched} renamed files (${totalImp} import-format, ${totalBlank} blank-line, ${totalTrailingBlank} trailing-blank restores)`);
