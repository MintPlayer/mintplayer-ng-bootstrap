import type { Operator } from './expression';
import type { FieldType } from './field-def';
export type OperatorCatalog = Readonly<Record<FieldType, readonly Operator[]>>;

export const DEFAULT_OPERATOR_CATALOG: OperatorCatalog = {
  string: [
    'equals', 'not-equals',
    'contains', 'does-not-contain', 'starts-with', 'ends-with',
    'is-null', 'is-not-null',
    'in', 'not-in',
  ],
  number: [
    'equals', 'not-equals',
    'lt', 'lte', 'gt', 'gte',
    'between', 'not-between',
    'is-null', 'is-not-null',
    'in', 'not-in',
  ],
  integer: [
    'equals', 'not-equals',
    'lt', 'lte', 'gt', 'gte',
    'between', 'not-between',
    'is-null', 'is-not-null',
    'in', 'not-in',
  ],
  date: [
    'equals', 'not-equals',
    'lt', 'lte', 'gt', 'gte',
    'between', 'not-between',
    'is-null', 'is-not-null',
    'today', 'yesterday',
    'this-week', 'last-week', 'next-week',
    'this-month', 'last-month', 'next-month',
    'this-year', 'last-year', 'next-year',
    'last-n-days', 'next-n-days',
    'year-to-date',
  ],
  datetime: [
    'equals', 'not-equals',
    'lt', 'lte', 'gt', 'gte',
    'between', 'not-between',
    'is-null', 'is-not-null',
    'today', 'yesterday',
    'this-week', 'last-week', 'next-week',
    'this-month', 'last-month', 'next-month',
    'this-year', 'last-year', 'next-year',
    'last-n-days', 'next-n-days',
    'year-to-date',
  ],
  boolean: ['is-true', 'is-false', 'is-null', 'is-not-null'],
  enum: ['equals', 'not-equals', 'in', 'not-in', 'is-null', 'is-not-null'],
  relation: ['in', 'not-in'],
  array: ['any-of', 'all-of', 'none-of', 'is-empty', 'is-not-empty'],
};

const PARAMETERLESS_OPERATORS: ReadonlySet<Operator> = new Set([
  'is-null', 'is-not-null', 'is-true', 'is-false',
  'is-empty', 'is-not-empty',
  'today', 'yesterday',
  'this-week', 'last-week', 'next-week',
  'this-month', 'last-month', 'next-month',
  'this-year', 'last-year', 'next-year',
  'year-to-date',
]);

const TUPLE_OPERATORS: ReadonlySet<Operator> = new Set(['between', 'not-between']);

const ARRAY_VALUE_OPERATORS: ReadonlySet<Operator> = new Set([
  'in', 'not-in',
  'any-of', 'all-of', 'none-of',
]);

const N_INPUT_OPERATORS: ReadonlySet<Operator> = new Set(['last-n-days', 'next-n-days']);

export type ValueShape = 'scalar' | 'tuple' | 'array' | 'n-input' | 'null';

export function valueShapeFor(operator: Operator): ValueShape {
  if (PARAMETERLESS_OPERATORS.has(operator)) return 'null';
  if (TUPLE_OPERATORS.has(operator)) return 'tuple';
  if (ARRAY_VALUE_OPERATORS.has(operator)) return 'array';
  if (N_INPUT_OPERATORS.has(operator)) return 'n-input';
  return 'scalar';
}

export function defaultValueFor(operator: Operator): unknown {
  switch (valueShapeFor(operator)) {
    case 'null': return null;
    case 'tuple': return [null, null];
    case 'array': return [];
    case 'n-input': return { n: 1 };
    case 'scalar': return null;
  }
}

export function operatorsForType(
  type: FieldType,
  catalog: OperatorCatalog = DEFAULT_OPERATOR_CATALOG,
): readonly Operator[] {
  return catalog[type] ?? [];
}
