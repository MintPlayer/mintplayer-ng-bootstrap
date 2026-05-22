import { describe, it, expect } from 'vitest';
import { renderExpression } from './render-expression';
import type { Condition, Expression, Group } from '@mintplayer/web-components/query-builder';
import type { EntitySchema } from '@mintplayer/web-components/query-builder';
import { MaxDepthExceededError } from '@mintplayer/web-components/query-builder';

const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'string' },
      { name: 'orderDate', label: 'Order date', type: 'date' },
      { name: 'tags', label: 'Tags', type: 'array' },
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

function cond(field: string, op: Condition['operator'], value: unknown): Condition {
  return { kind: 'condition', id: 'x', field, operator: op, value };
}

describe('renderExpression (M9)', () => {
  it('renders a single scalar condition', () => {
    const tree: Group = { kind: 'group', id: 'g', logic: 'and', children: [cond('total', 'gt', 100)] };
    expect(renderExpression(tree, SCHEMA)).toBe('(Total > 100)');
  });

  it('renders a string condition with quoted value', () => {
    const tree: Group = { kind: 'group', id: 'g', logic: 'and', children: [cond('status', 'equals', 'open')] };
    expect(renderExpression(tree, SCHEMA)).toBe('(Status = "open")');
  });

  it('renders nested AND/OR with proper parentheses', () => {
    const tree: Group = {
      kind: 'group', id: 'g', logic: 'and',
      children: [
        cond('total', 'gt', 100),
        {
          kind: 'group', id: 'g2', logic: 'or',
          children: [cond('status', 'equals', 'open'), cond('status', 'equals', 'paid')],
        },
      ],
    };
    expect(renderExpression(tree, SCHEMA)).toBe(
      '(Total > 100 AND (Status = "open" OR Status = "paid"))',
    );
  });

  it('renders parameterless operators with no value', () => {
    const tree: Group = { kind: 'group', id: 'g', logic: 'and', children: [cond('total', 'is-null', null)] };
    expect(renderExpression(tree, SCHEMA)).toBe('(Total is null)');
  });

  it('renders relative date ops with the localized label', () => {
    const tree: Group = {
      kind: 'group', id: 'g', logic: 'and',
      children: [cond('orderDate', 'last-n-days', { n: 7 })],
    };
    expect(renderExpression(tree, SCHEMA)).toBe('(Order date is in the last N days 7)');
  });

  it('renders array ops with bracketed value lists', () => {
    const tree: Group = {
      kind: 'group', id: 'g', logic: 'and',
      children: [cond('tags', 'any-of', ['urgent', 'blocked'])],
    };
    expect(renderExpression(tree, SCHEMA)).toBe('(Tags any of ["urgent", "blocked"])');
  });

  it('renders between as a bracketed tuple', () => {
    const tree: Group = {
      kind: 'group', id: 'g', logic: 'and',
      children: [cond('total', 'between', [10, 100])],
    };
    expect(renderExpression(tree, SCHEMA)).toBe('(Total between [10, 100])');
  });

  it('renders sub-queries with the inner walked under the target entity', () => {
    const tree: Group = {
      kind: 'group', id: 'g', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: {
            kind: 'group', id: 'sg', logic: 'and',
            children: [cond('amount', 'between', [10, 500])],
          },
        },
      ],
    };
    expect(renderExpression(tree, SCHEMA)).toBe(
      '(Line items in (Amount between [10, 500]))',
    );
  });

  it('returns "TRUE" for an empty AND group and "FALSE" for an empty OR group', () => {
    expect(renderExpression({ kind: 'group', id: 'g', logic: 'and', children: [] }, SCHEMA)).toBe('TRUE');
    expect(renderExpression({ kind: 'group', id: 'g', logic: 'or', children: [] }, SCHEMA)).toBe('FALSE');
  });

  it('throws MaxDepthExceededError when the tree is deeper than maxDepth', () => {
    let inner: Expression = { kind: 'group', id: 'g0', logic: 'and', children: [] };
    for (let i = 0; i < 5; i++) {
      inner = { kind: 'group', id: `g${i + 1}`, logic: 'and', children: [inner] };
    }
    expect(() => renderExpression(inner, SCHEMA, { maxDepth: 2 })).toThrow(MaxDepthExceededError);
  });

  it('honours custom messages.operators overrides', () => {
    const tree: Group = { kind: 'group', id: 'g', logic: 'and', children: [cond('total', 'gt', 100)] };
    expect(renderExpression(tree, SCHEMA, { messages: { operators: { 'gt': '>>' } } }))
      .toBe('(Total >> 100)');
  });

  it('renders unknown field names verbatim', () => {
    const tree: Group = {
      kind: 'group', id: 'g', logic: 'and',
      children: [cond('mystery', 'equals', 'x')],
    };
    expect(renderExpression(tree, SCHEMA)).toBe('(mystery = "x")');
  });
});
