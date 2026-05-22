import { describe, it, expect } from 'vitest';
import type { FieldType, Operator } from './expression';
import { DEFAULT_OPERATOR_CATALOG, defaultValueFor, operatorsForType, valueShapeFor } from './operators';
const ALL_FIELD_TYPES: FieldType[] = [
  'string', 'number', 'integer', 'date', 'datetime', 'boolean', 'enum', 'relation', 'array',
];

describe('OperatorCatalog (M6) — coverage', () => {
  it('every FieldType has a non-empty operator list', () => {
    for (const t of ALL_FIELD_TYPES) {
      expect(operatorsForType(t).length).toBeGreaterThan(0);
    }
  });

  it('string has the Infragistics-parity operator set', () => {
    expect(DEFAULT_OPERATOR_CATALOG.string).toEqual([
      'equals', 'not-equals',
      'contains', 'does-not-contain', 'starts-with', 'ends-with',
      'is-null', 'is-not-null',
      'in', 'not-in',
    ]);
  });

  it('number and integer share the same operator set', () => {
    expect(DEFAULT_OPERATOR_CATALOG.number).toEqual(DEFAULT_OPERATOR_CATALOG.integer);
  });

  it('date includes all 13 relative-date operators from Appendix A', () => {
    const date = new Set<Operator>(DEFAULT_OPERATOR_CATALOG.date);
    for (const op of [
      'today', 'yesterday',
      'this-week', 'last-week', 'next-week',
      'this-month', 'last-month', 'next-month',
      'this-year', 'last-year', 'next-year',
      'last-n-days', 'next-n-days',
      'year-to-date',
    ] as Operator[]) {
      expect(date.has(op)).toBe(true);
    }
  });

  it('boolean operators are all parameterless', () => {
    expect(DEFAULT_OPERATOR_CATALOG.boolean).toEqual([
      'is-true', 'is-false', 'is-null', 'is-not-null',
    ]);
    for (const op of DEFAULT_OPERATOR_CATALOG.boolean) {
      expect(valueShapeFor(op)).toBe('null');
    }
  });

  it('enum operators are scalar/set/null only — no comparison operators', () => {
    const enumOps = new Set(DEFAULT_OPERATOR_CATALOG.enum);
    expect(enumOps.has('lt')).toBe(false);
    expect(enumOps.has('between')).toBe(false);
    expect(enumOps.has('contains')).toBe(false);
  });

  it('array has the five array-shape operators only', () => {
    expect(DEFAULT_OPERATOR_CATALOG.array).toEqual([
      'any-of', 'all-of', 'none-of', 'is-empty', 'is-not-empty',
    ]);
  });

  it('relation is limited to in / not-in (for sub-queries)', () => {
    expect(DEFAULT_OPERATOR_CATALOG.relation).toEqual(['in', 'not-in']);
  });

  it('datetime mirrors date (same operator surface)', () => {
    expect(DEFAULT_OPERATOR_CATALOG.datetime).toEqual(DEFAULT_OPERATOR_CATALOG.date);
  });
});

describe('valueShapeFor (M6) — every operator', () => {
  const expectShape: Record<Operator, ReturnType<typeof valueShapeFor>> = {
    'equals': 'scalar', 'not-equals': 'scalar',
    'contains': 'scalar', 'does-not-contain': 'scalar',
    'starts-with': 'scalar', 'ends-with': 'scalar',
    'lt': 'scalar', 'lte': 'scalar', 'gt': 'scalar', 'gte': 'scalar',
    'between': 'tuple', 'not-between': 'tuple',
    'in': 'array', 'not-in': 'array',
    'is-null': 'null', 'is-not-null': 'null',
    'is-true': 'null', 'is-false': 'null',
    'today': 'null', 'yesterday': 'null',
    'this-week': 'null', 'last-week': 'null', 'next-week': 'null',
    'this-month': 'null', 'last-month': 'null', 'next-month': 'null',
    'this-year': 'null', 'last-year': 'null', 'next-year': 'null',
    'year-to-date': 'null',
    'last-n-days': 'n-input', 'next-n-days': 'n-input',
    'any-of': 'array', 'all-of': 'array', 'none-of': 'array',
    'is-empty': 'null', 'is-not-empty': 'null',
  };

  for (const [op, shape] of Object.entries(expectShape) as Array<[Operator, ReturnType<typeof valueShapeFor>]>) {
    it(`${op} → ${shape}`, () => {
      expect(valueShapeFor(op)).toBe(shape);
    });
  }
});

describe('defaultValueFor (M6)', () => {
  it('null shape → null', () => {
    expect(defaultValueFor('is-null')).toBe(null);
    expect(defaultValueFor('today')).toBe(null);
    expect(defaultValueFor('is-empty')).toBe(null);
  });
  it('tuple shape → [null, null]', () => {
    expect(defaultValueFor('between')).toEqual([null, null]);
  });
  it('array shape → []', () => {
    expect(defaultValueFor('in')).toEqual([]);
    expect(defaultValueFor('any-of')).toEqual([]);
  });
  it('n-input shape → { n: 1 }', () => {
    expect(defaultValueFor('last-n-days')).toEqual({ n: 1 });
  });
  it('scalar shape → null', () => {
    expect(defaultValueFor('equals')).toBe(null);
    expect(defaultValueFor('gt')).toBe(null);
  });
});

describe('operatorsForType honors a custom catalog', () => {
  it('returns the catalog override when provided', () => {
    const custom = {
      ...DEFAULT_OPERATOR_CATALOG,
      string: ['equals' as Operator] as readonly Operator[],
    };
    expect(operatorsForType('string', custom)).toEqual(['equals']);
  });
});
