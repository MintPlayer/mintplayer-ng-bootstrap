import { describe, it, expect } from 'vitest';
import type { EntitySchema } from './field-def';
import { validateOperatorOverrides } from './operator-overrides';
const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'string' },
      { name: 'orderDate', label: 'Order date', type: 'date' },
      { name: 'tags', label: 'Tags', type: 'array' },
    ],
  },
];

describe('validateOperatorOverrides (M6)', () => {
  it('returns empty sanitized when overrides is undefined', () => {
    const r = validateOperatorOverrides(SCHEMA, undefined);
    expect(r.sanitized).toEqual({});
    expect(r.warnings).toEqual([]);
  });

  it('passes through valid operators per field type', () => {
    const r = validateOperatorOverrides(SCHEMA, {
      total: ['equals', 'between'],
      status: ['contains', 'equals'],
    });
    expect(r.sanitized).toEqual({
      total: ['equals', 'between'],
      status: ['contains', 'equals'],
    });
    expect(r.warnings).toEqual([]);
  });

  it('strips operators not in the catalog for the field type', () => {
    const r = validateOperatorOverrides(SCHEMA, {
      // `contains` is a string operator; `total` is a number field.
      total: ['equals', 'contains'],
    });
    expect(r.sanitized.total).toEqual(['equals']);
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toMatch(/total/);
    expect(r.warnings[0]).toMatch(/contains/);
  });

  it('warns when an empty operator set remains after intersection', () => {
    const r = validateOperatorOverrides(SCHEMA, {
      // All these are string operators; `total` is number.
      total: ['contains', 'starts-with'],
    });
    expect(r.sanitized.total).toEqual([]);
    expect(r.warnings.length).toBe(2); // one "stripping", one "empty"
  });

  it('warns and skips when the field is not in any schema entity', () => {
    const r = validateOperatorOverrides(SCHEMA, {
      bogus: ['equals'],
    });
    expect(r.sanitized).toEqual({});
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toMatch(/Unknown field "bogus"/);
  });

  it('array-typed field accepts array-shape operators only', () => {
    const r = validateOperatorOverrides(SCHEMA, {
      tags: ['any-of', 'equals', 'all-of', 'contains'],
    });
    expect(r.sanitized.tags).toEqual(['any-of', 'all-of']);
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toMatch(/equals.*contains|contains.*equals/);
  });
});
