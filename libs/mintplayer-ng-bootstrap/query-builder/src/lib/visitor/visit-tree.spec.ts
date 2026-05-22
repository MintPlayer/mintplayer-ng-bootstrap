import { describe, it, expect } from 'vitest';
import { visitTree } from './visit-tree';
import type { TreeVisitor } from './visitor-types';
import { type Condition, type Expression, type Group, type EntitySchema, MaxDepthExceededError } from '@mintplayer/web-components/query-builder';

const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'lineItems', label: 'Line items', type: 'relation', targetEntity: 'lineItems' },
    ],
  },
  {
    name: 'lineItems',
    label: 'Line items',
    fields: [
      { name: 'amount', label: 'Amount', type: 'number' },
    ],
  },
];

function cond(id: string, field: string, value: unknown): Condition {
  return { kind: 'condition', id, field, operator: 'gt', value };
}

describe('visitTree (M10)', () => {
  it('counts nodes via an eager visitor', () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        cond('c1', 'total', 100),
        cond('c2', 'total', 50),
      ],
    };
    const visitor: TreeVisitor<number> = {
      condition: () => 1,
      group: (_, children) => children.reduce((a, b) => a + b, 0),
      subquery: (_, _ctx, walkInner) => walkInner(),
    };
    expect(visitTree(tree, visitor, { schema: SCHEMA, rootEntity: 'orders' })).toBe(2);
  });

  it('walkInner lets visitors scope context per sub-tree', () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        cond('c1', 'total', 100),
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: { kind: 'group', id: 'sg', logic: 'and', children: [cond('inner', 'amount', 5)] },
        },
      ],
    };
    // Build a comma-joined list of "entity.field" for every condition seen.
    const visitor: TreeVisitor<string[]> = {
      condition: (n, ctx) => [`${ctx.currentEntity}.${n.field}`],
      group: (_, children) => children.flat(),
      subquery: (_, _ctx, walkInner) => walkInner(),
    };
    const result = visitTree(tree, visitor, { schema: SCHEMA, rootEntity: 'orders' });
    expect(result).toEqual(['orders.total', 'lineItems.amount']);
  });

  it('skipping walkInner produces a lazy visitor — useful for short-circuit', () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: { kind: 'group', id: 'sg', logic: 'and', children: [cond('inner', 'amount', 5)] },
        },
      ],
    };
    let innerCalled = 0;
    const visitor: TreeVisitor<string> = {
      condition: () => { innerCalled++; return 'c'; },
      group: (_, children) => `g[${children.join(',')}]`,
      subquery: () => 'sq', // NEVER calls walkInner.
    };
    const result = visitTree(tree, visitor, { schema: SCHEMA, rootEntity: 'orders' });
    expect(result).toBe('g[sq]');
    expect(innerCalled).toBe(0); // confirmed lazy
  });

  it('throws MaxDepthExceededError when the walker exceeds the bound', () => {
    let inner: Expression = { kind: 'group', id: 'g0', logic: 'and', children: [] };
    for (let i = 0; i < 5; i++) {
      inner = { kind: 'group', id: `g${i + 1}`, logic: 'and', children: [inner] };
    }
    const visitor: TreeVisitor<unknown> = {
      condition: () => undefined,
      group: () => undefined,
      subquery: () => undefined,
    };
    expect(() => visitTree(inner, visitor, { schema: SCHEMA, rootEntity: 'orders' }, { maxDepth: 2 }))
      .toThrow(MaxDepthExceededError);
  });

  it('throws when a sub-query references a non-relation field', () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq', field: 'total', operator: 'in',
          subQuery: { kind: 'group', id: 'sg', logic: 'and', children: [] },
        },
      ],
    };
    const visitor: TreeVisitor<string> = {
      condition: () => 'c', group: () => 'g', subquery: () => 'sq',
    };
    expect(() => visitTree(tree, visitor, { schema: SCHEMA, rootEntity: 'orders' }))
      .toThrow(/is not a relation/);
  });

  it('throws when a sub-query references an unknown field', () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq', field: 'mystery', operator: 'in',
          subQuery: { kind: 'group', id: 'sg', logic: 'and', children: [] },
        },
      ],
    };
    const visitor: TreeVisitor<string> = {
      condition: () => 'c', group: () => 'g', subquery: () => 'sq',
    };
    expect(() => visitTree(tree, visitor, { schema: SCHEMA, rootEntity: 'orders' }))
      .toThrow(/has no field "mystery"/);
  });
});
