import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Pure helpers behind `properties-attributes.spec.ts`: reading the custom
 * elements manifest, resolving a declared type to a set of representative
 * values, and emulating lit's default attribute converter.
 *
 * Nothing here touches the DOM, so every rule the table spec relies on can be
 * read (and changed) in one place.
 */

export interface CemType {
  text?: string;
}

export interface CemMember {
  kind: string;
  name: string;
  static?: boolean;
  privacy?: string;
  readonly?: boolean;
  reflects?: boolean;
  attribute?: string;
  type?: CemType;
}

export interface CemAttribute {
  name: string;
  fieldName?: string;
  type?: CemType;
}

export interface CemElement {
  /** Module path relative to the lib root, e.g. `calendar/src/mp-calendar.element.ts`. */
  path: string;
  name: string;
  tagName?: string;
  customElement?: boolean;
  members?: CemMember[];
  attributes?: CemAttribute[];
}

interface CemManifest {
  modules: { path: string; declarations?: Omit<CemElement, 'path'>[] }[];
}

/** Every custom-element class declaration in the manifest, with its module path. */
export function manifestElements(manifestJson: string): CemElement[] {
  const manifest = JSON.parse(manifestJson) as CemManifest;
  return manifest.modules.flatMap((mod) =>
    (mod.declarations ?? []).filter((d) => d.customElement).map((d) => ({ ...d, path: mod.path })),
  );
}

/** The public, writable-or-not instance fields a consumer can see. */
export function publicFields(el: CemElement): CemMember[] {
  return (el.members ?? []).filter(
    (m) => m.kind === 'field' && !m.static && (m.privacy ?? 'public') === 'public' && !m.name.startsWith('_'),
  );
}

export const kebabToCamel = (name: string): string => name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/* ------------------------------------------------------------------ */
/* Type domains                                                        */
/* ------------------------------------------------------------------ */

export type Literal = string | number | boolean;

/**
 * What a declared type admits, reduced to the shapes the table can exercise
 * generically. `unsupported` carries the reason, which becomes the skip text.
 */
export type Domain =
  | { kind: 'boolean' }
  | { kind: 'number' }
  | { kind: 'string' }
  | { kind: 'literal'; values: Literal[] }
  | { kind: 'date' }
  | { kind: 'string[]' }
  | { kind: 'number[]' }
  | { kind: 'unsupported'; reason: string };

const LITERAL = /^(?:'([^']*)'|"([^"]*)"|(-?\d+(?:\.\d+)?)|(true|false))$/;

function parseLiteral(part: string): Literal | undefined {
  const m = LITERAL.exec(part);
  if (!m) return undefined;
  if (m[1] !== undefined) return m[1];
  if (m[2] !== undefined) return m[2];
  if (m[3] !== undefined) return Number(m[3]);
  return m[4] === 'true';
}

/** Splits a union on top-level `|` (types with parentheses or generics are not split). */
const unionParts = (text: string): string[] => text.split('|').map((p) => p.trim()).filter(Boolean);

/**
 * `export type X = 'a' | 'b' | 1;` declarations across the lib sources,
 * resolved transitively (an alias of aliases of literals is still literals).
 * The manifest names alias types but never expands them, so without this every
 * `size: RibbonItemSize` would be an unexercised case.
 */
export function scanLiteralAliases(libRoot: string): Map<string, Literal[]> {
  const files = walkTs(libRoot);
  const raw = new Map<string, string>(
    files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/export\s+type\s+(\w+)\s*=\s*([^;{}()<>[\]]+);/g)].map(
        (m) => [m[1], m[2].replace(/\s+/g, ' ').trim()] as [string, string],
      ),
    ),
  );
  const resolve = (name: string, seen: Set<string>): Literal[] | undefined => {
    const text = raw.get(name);
    if (text === undefined || seen.has(name)) return undefined;
    const parts = unionParts(text).map((p) => {
      if (p === 'boolean') return [true, false];
      const lit = parseLiteral(p);
      return lit !== undefined ? [lit] : resolve(p, new Set([...seen, name]));
    });
    return parts.every((p) => p !== undefined) ? parts.flat() as Literal[] : undefined;
  };
  return new Map(
    [...raw.keys()].map((name) => [name, resolve(name, new Set())] as const).filter(
      (e): e is readonly [string, Literal[]] => e[1] !== undefined,
    ),
  );
}

function walkTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return ['node_modules', 'dist', '_conformance'].includes(entry.name) ? [] : walkTs(full);
    }
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [full] : [];
  });
}

/** Reduces a manifest type text to a {@link Domain}. `null` / `undefined` members are ignored. */
export function domainOf(typeText: string | undefined, aliases: Map<string, Literal[]>): Domain {
  if (!typeText) return { kind: 'unsupported', reason: 'no declared type in the manifest' };
  const text = typeText.trim();
  if (/=>|[{}<]/.test(text) || text.startsWith('readonly')) {
    return { kind: 'unsupported', reason: `structured type (${text.slice(0, 40)})` };
  }
  const parts = unionParts(text).filter((p) => p !== 'null' && p !== 'undefined');
  if (parts.length === 1) {
    const [p] = parts;
    if (p === 'boolean') return { kind: 'boolean' };
    if (p === 'number') return { kind: 'number' };
    if (p === 'string') return { kind: 'string' };
    if (p === 'Date') return { kind: 'date' };
    if (p === 'string[]') return { kind: 'string[]' };
    if (p === 'number[]') return { kind: 'number[]' };
  }
  const literals = parts.map((p) => {
    if (p === 'boolean') return [true, false];
    const lit = parseLiteral(p);
    return lit !== undefined ? [lit] : aliases.get(p);
  });
  if (literals.every((l) => l !== undefined)) return { kind: 'literal', values: literals.flat() as Literal[] };
  return { kind: 'unsupported', reason: `type ${text.slice(0, 40)} is not a primitive or literal union` };
}

/**
 * A value for `domain` that is not `current`, so a round-trip proves the write
 * landed rather than that nothing happened.
 */
export function representative(domain: Domain, current: unknown): unknown {
  switch (domain.kind) {
    case 'boolean':
      return current !== true;
    case 'number':
      return current === 7 ? 8 : 7;
    case 'string':
      return current === 'm20-probe' ? 'm20-other' : 'm20-probe';
    case 'literal': {
      const other = domain.values.find((v) => v !== current);
      return other ?? domain.values[0];
    }
    case 'date':
      return new Date(2024, 0, 15, 9, 30);
    case 'string[]':
      return ['m20-a', 'm20-b'];
    case 'number[]':
      return [3, 4];
    default:
      return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* lit's default converter                                             */
/* ------------------------------------------------------------------ */

/** The `type` option of a lit property declaration, as far as the default converter cares. */
export type LitType = typeof String | typeof Number | typeof Boolean | typeof Object | typeof Array | undefined;

/**
 * lit's `defaultConverter.fromAttribute`, restated so the spec states the
 * contract it relies on instead of importing the thing under test.
 */
export function litFromAttribute(value: string | null, type: LitType): unknown {
  if (type === Boolean) return value !== null;
  if (value === null) return null;
  if (type === Number) return Number(value);
  if (type === Object || type === Array) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

/** How a property value appears as a reflected attribute (`null` = attribute absent). */
export function reflectedAttribute(value: unknown): string | null {
  if (value === false || value === null || value === undefined) return null;
  if (value === true) return '';
  return String(value);
}
