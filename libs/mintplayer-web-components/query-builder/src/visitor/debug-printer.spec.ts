import { describe, it, expect } from 'vitest';
import type { TreeVisitor } from './visitor-types';
import { visitTree } from './visit-tree';
import type { Expression, Group } from '../model/expression';
import type { EntitySchema } from '../model/field-def';

/**
 * Reference example: a `visitTree<string>` consumer that produces a pretty
 * indented dump for debugging. Demonstrates BOTH eager (call walkInner) and
 * scoped (wrap state around walkInner) use.
 *
 * Run with:
 *   import { visitTree } from '@mintplayer/ng-bootstrap/query-builder';
 *   const dump = visitTree(tree, debugPrinter, { schema, rootEntity });
 */

const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'lineItems', label: 'Line items', type: 'relation', targetEntity: 'lineItems' },
    ],
  },
  { name: 'lineItems', label: 'Line items', fields: [{ name: 'amount', label: 'Amount', type: 'number' }] },
];

const debugPrinter: TreeVisitor<string> = {
  condition(node, ctx) {
    return `${indent(ctx.depth)}- [${ctx.currentEntity}.${node.field} ${node.operator} ${JSON.stringify(node.value)}]`;
  },
  group(node, children, ctx) {
    return `${indent(ctx.depth)}${node.logic.toUpperCase()}\n${children.join('\n')}`;
  },
  subquery(node, ctx, walkInner) {
    const inner = walkInner(); // scoped: ctx for inner is the relation's targetEntity
    return `${indent(ctx.depth)}~ subquery on ${node.field} ${node.operator}\n${inner}`;
  },
};

function indent(depth: number): string {
  return '  '.repeat(depth);
}

describe('visitTree debug-printer reference', () => {
  it('produces an indented dump for a nested tree', () => {
    const tree: Group = {
      kind: 'group', id: 'g', logic: 'and',
      children: [
        { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 },
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: {
            kind: 'group', id: 'sg', logic: 'or',
            children: [{ kind: 'condition', id: 'c2', field: 'amount', operator: 'gt', value: 5 }],
          },
        },
      ],
    };
    const dump = visitTree(tree, debugPrinter, { schema: SCHEMA, rootEntity: 'orders' });
    expect(dump).toContain('AND');
    expect(dump).toContain('orders.total gt 100');
    expect(dump).toContain('subquery on lineItems in');
    expect(dump).toContain('lineItems.amount gt 5'); // confirms inner walked under targetEntity
  });

  it('a count-only visitor that never calls walkInner returns sub-query counts without descending', () => {
    const tree: Expression = {
      kind: 'group', id: 'g', logic: 'and',
      children: [
        { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 },
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: {
            kind: 'group', id: 'sg', logic: 'and',
            children: [{ kind: 'condition', id: 'c2', field: 'amount', operator: 'gt', value: 5 }],
          },
        },
      ],
    };
    const counter: TreeVisitor<{ conds: number; sqs: number }> = {
      condition: () => ({ conds: 1, sqs: 0 }),
      group: (_, children) => children.reduce((a, b) => ({ conds: a.conds + b.conds, sqs: a.sqs + b.sqs }), { conds: 0, sqs: 0 }),
      // Do NOT call walkInner — the inner is "hidden" behind the sub-query node.
      subquery: () => ({ conds: 0, sqs: 1 }),
    };
    const total = visitTree(tree, counter, { schema: SCHEMA, rootEntity: 'orders' });
    expect(total).toEqual({ conds: 1, sqs: 1 });
  });
});
