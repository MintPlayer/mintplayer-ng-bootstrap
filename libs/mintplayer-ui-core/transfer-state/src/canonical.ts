/**
 * The one serialization a request key, a reload's change key and a transfer
 * key are built from (#448 D2), so the three can never disagree about whether
 * two requests are the same.
 */

/** A value that survives `JSON.stringify` → `JSON.parse` unchanged. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/**
 * Thrown for a value a request key cannot hold. `path` names where it sits
 * (`fetchParams.filter.since`), so the consumer finds it without a debugger.
 */
export class NonJsonValueError extends Error {
  constructor(readonly path: string, readonly kind: string) {
    super(`${path} is ${kind}; only plain JSON values (strings, finite numbers, booleans, null, arrays and plain objects) can be part of a request.`);
    this.name = 'NonJsonValueError';
  }
}

const kindOf = (value: unknown): string | null => {
  switch (typeof value) {
    case 'function':
      return 'a function';
    case 'symbol':
      return 'a symbol';
    case 'bigint':
      return 'a bigint';
    case 'undefined':
      return null;
    case 'number':
      return Number.isFinite(value) ? null : `a non-finite number (${value})`;
    case 'object': {
      if (value === null || Array.isArray(value)) return null;
      if (value instanceof Date) return 'a Date (send an ISO string)';
      const proto = Object.getPrototypeOf(value);
      return proto === Object.prototype || proto === null ? null : `an instance of ${proto?.constructor?.name ?? 'a class'}`;
    }
    default:
      return null;
  }
};

/**
 * Validates `value` as JSON and returns it with object keys sorted, so equal
 * values serialize to equal strings. `undefined` properties are dropped, as
 * `JSON.stringify` drops them; an `undefined` array entry becomes `null`.
 */
export function canonicalValue(value: unknown, path = 'value', seen: Set<object> = new Set()): JsonValue | undefined {
  const kind = kindOf(value);
  if (kind) throw new NonJsonValueError(path, kind);
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value as JsonValue;
  if (seen.has(value)) throw new NonJsonValueError(path, 'a cycle');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((v, i) => canonicalValue(v, `${path}[${i}]`, seen) ?? null);
    const entries = Object.keys(value)
      .sort()
      .map((key) => [key, canonicalValue((value as Record<string, unknown>)[key], `${path}.${key}`, seen)] as const)
      .filter(([, v]) => v !== undefined);
    return Object.fromEntries(entries) as JsonValue;
  } finally {
    seen.delete(value);
  }
}

/** `canonicalValue` as a string: the form keys are compared and hashed in. */
export function canonicalJson(value: unknown, path = 'value'): string {
  return JSON.stringify(canonicalValue(value, path) ?? null);
}

/** A short, stable hash of a string (FNV-1a, 53 bits), for keys that should not carry a whole request. */
export function hashKey(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return ((h2 >>> 0) * 0x200000 + ((h1 >>> 0) & 0x1fffff)).toString(36);
}
