// The string-literal members of a core's inputs, read from its TypeScript
// sources, so a compiled Lit element can refuse an attribute that names none of
// them (`orientation="sideways"` keeps the default rather than reaching the core).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function walkTs(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return ['node_modules', 'generated', 'templates'].includes(entry.name) ? [] : walkTs(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [full] : [];
  });
}

const unionParts = (text) => text.split('|').map((part) => part.trim()).filter(Boolean);
const STRING_LITERAL = /^'([^']*)'$|^"([^"]*)"$/;

/**
 * @param {string} dir  The core entry's source directory.
 * @returns {(inputsType: string, member: string) => string[] | null}  The member's
 *   string literals, or null when its type is anything but a union of them
 *   (`null` / `undefined` members aside).
 */
export function literalTypes(dir) {
  const texts = walkTs(dir).map((file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
  const aliases = new Map(
    texts.flatMap((text) => [...text.matchAll(/export\s+type\s+(\w+)\s*=\s*([^;{}()<>[\]]+);/g)].map((m) => [m[1], m[2].replace(/\s+/g, ' ').trim()])),
  );
  const interfaces = new Map(
    texts.flatMap((text) =>
      [...text.matchAll(/export\s+interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+([\w\s,]+))?\s*\{\n([\s\S]*?)\n\}/g)].map((m) => [
        m[1],
        {
          parents: (m[2] ?? '').split(',').map((p) => p.trim()).filter(Boolean),
          members: new Map([...m[3].matchAll(/^\s+(?:readonly\s+)?(\w+)\??:\s*([^;\n]+);/gm)].map((member) => [member[1], member[2].trim()])),
        },
      ]),
    ),
  );
  const memberType = (name, member, seen = new Set()) => {
    const entry = interfaces.get(name);
    if (!entry || seen.has(name)) return undefined;
    return entry.members.get(member) ?? entry.parents.map((parent) => memberType(parent, member, new Set([...seen, name]))).find((t) => t !== undefined);
  };
  const literals = (text, seen) => {
    const parts = unionParts(text)
      .filter((part) => part !== 'null' && part !== 'undefined')
      .map((part) => {
        const m = STRING_LITERAL.exec(part);
        if (m) return [m[1] ?? m[2]];
        // An indexed access into another interface: `RibbonItemInputs['size']`.
        const indexed = /^(\w+)\[['"](\w+)['"]\]$/.exec(part);
        const target = indexed && !seen.has(part) ? memberType(indexed[1], indexed[2]) : undefined;
        if (target !== undefined) return literals(target, new Set([...seen, part]));
        return aliases.has(part) && !seen.has(part) ? literals(aliases.get(part), new Set([...seen, part])) : null;
      });
    return parts.length && parts.every(Boolean) ? parts.flat() : null;
  };
  return (inputsType, member) => {
    const text = inputsType ? memberType(inputsType, member) : undefined;
    return text === undefined ? null : literals(text, new Set());
  };
}
