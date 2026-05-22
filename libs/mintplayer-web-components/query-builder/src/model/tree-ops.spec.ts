import { describe, it, expect } from 'vitest';
import type { Condition, Expression, Group, SubQueryCondition } from './expression';
import type { EntitySchema } from './field-def';
import { addChild, addEmptyConditionTo, addEmptyGroupTo, addEmptySubqueryTo, changeConditionField, changeConditionOperator, collectDescendantIds, findNodeById, moveNode, removeNode, setGroupLogic, updateCondition } from './tree-ops';
const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'string' },
      { name: 'orderDate', label: 'Order date', type: 'date' },
      { name: 'lineItems', label: 'Line items', type: 'relation', targetEntity: 'lineItems' },
    ],
  },
  {
    name: 'lineItems',
    label: 'Line items',
    fields: [
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'productName', label: 'Product', type: 'string' },
    ],
  },
];

function tree(): Group {
  const c1: Condition = { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 };
  const c2: Condition = { kind: 'condition', id: 'c2', field: 'status', operator: 'equals', value: 'open' };
  const g2: Group = { kind: 'group', id: 'g2', logic: 'or', children: [c2] };
  return { kind: 'group', id: 'g1', logic: 'and', children: [c1, g2] };
}

describe('tree-ops', () => {
  it('addChild appends to the matching group; original tree unchanged', () => {
    const t = tree();
    const newCond: Condition = { kind: 'condition', id: 'c3', field: 'total', operator: 'lt', value: 50 };
    const next = addChild(t, 'g1', newCond) as Group;
    expect(next.children).toHaveLength(3);
    expect(next.children[2]).toBe(newCond);
    expect(t.children).toHaveLength(2); // untouched
  });

  it('addEmptyConditionTo uses the schema for default field/operator/value', () => {
    const t = tree();
    const orders = SCHEMA[0]!;
    const next = addEmptyConditionTo(t, 'g1', orders) as Group;
    expect(next.children).toHaveLength(3);
    const added = next.children[2] as Condition;
    expect(added.kind).toBe('condition');
    expect(added.field).toBe('total');
  });

  it('removeNode strips the matching node anywhere in the tree', () => {
    const t = tree();
    const next = removeNode(t, 'c2') as Group;
    const g2 = next.children.find((c) => c.kind === 'group' && c.id === 'g2') as Group;
    expect(g2.children).toHaveLength(0);
  });

  it('removeNode preserves the original tree (immutability)', () => {
    const t = tree();
    removeNode(t, 'c1');
    expect(t.children).toHaveLength(2);
  });

  it('setGroupLogic flips and/or', () => {
    const t = tree();
    const next = setGroupLogic(t, 'g2', 'and') as Group;
    const g2 = next.children.find((c) => c.kind === 'group' && c.id === 'g2') as Group;
    expect(g2.logic).toBe('and');
  });

  it('updateCondition patches field/operator/value', () => {
    const t = tree();
    const next = updateCondition(t, 'c1', { value: 200 }) as Group;
    expect((next.children[0] as Condition).value).toBe(200);
  });

  it('changeConditionField resets operator+value when value-shape mismatches', () => {
    const t = tree();
    // c1: total > 100 (number, gt). Change to status (string).
    const status = SCHEMA[0]!.fields.find((f) => f.name === 'status')!;
    const next = changeConditionField(t, 'c1', status) as Group;
    const c1 = next.children[0] as Condition;
    expect(c1.field).toBe('status');
    expect(c1.operator).toBe('equals'); // string's first valid op
    expect(c1.value).toBe(null);
  });

  it('changeConditionField preserves operator+value when shape matches', () => {
    const t = tree();
    // Change c2 (status equals "open") to orderDate (date). "equals" exists for date too.
    const orderDate = SCHEMA[0]!.fields.find((f) => f.name === 'orderDate')!;
    const next = changeConditionField(t, 'c2', orderDate) as Group;
    const g2 = next.children.find((c) => c.kind === 'group' && c.id === 'g2') as Group;
    const c2 = g2.children[0] as Condition;
    expect(c2.field).toBe('orderDate');
    expect(c2.operator).toBe('equals');
    expect(c2.value).toBe('open'); // preserved
  });

  it('changeConditionOperator resets value when shape changes', () => {
    const t = tree();
    // c1: total > 100. Change to between (tuple).
    const next = changeConditionOperator(t, 'c1', 'between') as Group;
    const c1 = next.children[0] as Condition;
    expect(c1.operator).toBe('between');
    expect(c1.value).toEqual([null, null]);
  });

  it('changeConditionOperator preserves value when shape unchanged', () => {
    const t = tree();
    // c1: total > 100. Change to >= (still scalar).
    const next = changeConditionOperator(t, 'c1', 'gte') as Group;
    const c1 = next.children[0] as Condition;
    expect(c1.operator).toBe('gte');
    expect(c1.value).toBe(100);
  });

  it('findNodeById walks into sub-query bodies', () => {
    const innerCond: Condition = { kind: 'condition', id: 'inner-c', field: 'amount', operator: 'gt', value: 5 };
    const sub: SubQueryCondition = {
      kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
      subQuery: { kind: 'group', id: 'sg', logic: 'and', children: [innerCond] },
    };
    const t: Group = { kind: 'group', id: 'r', logic: 'and', children: [sub] };
    expect(findNodeById(t, 'inner-c')).toBe(innerCond);
    expect(findNodeById(t, 'sg')?.id).toBe('sg');
    expect(findNodeById(t, 'nope')).toBeNull();
  });

  it('collectDescendantIds returns the closure of ids', () => {
    const t = tree();
    const ids = collectDescendantIds(t);
    expect(ids.has('g1')).toBe(true);
    expect(ids.has('g2')).toBe(true);
    expect(ids.has('c1')).toBe(true);
    expect(ids.has('c2')).toBe(true);
    expect(ids.size).toBe(4);
  });

  it('moveNode moves a child within the same group', () => {
    const t = tree();
    const next = moveNode(t, 'c1', 'g1', 2) as Group;
    expect(next.children.map((c) => c.id)).toEqual(['g2', 'c1']);
  });

  it('moveNode rejects a drop into the moved node\'s own descendants (cycle)', () => {
    const t = tree();
    // Try to move g2 into c2 — c2 is not a group, can't be a parent; but try
    // g2 into g2 itself.
    const next = moveNode(t, 'g2', 'g2', 0) as Group;
    expect(next).toEqual(t); // unchanged
  });

  it('addEmptyGroupTo nests a new AND group', () => {
    const t = tree();
    const next = addEmptyGroupTo(t, 'g1') as Group;
    expect(next.children).toHaveLength(3);
    const added = next.children[2] as Group;
    expect(added.kind).toBe('group');
    expect(added.logic).toBe('and');
    expect(added.children).toHaveLength(0);
  });

  it('addEmptySubqueryTo no-ops when entity has no relation field', () => {
    const t = tree();
    const lineItems = SCHEMA[1]!;
    const next = addEmptySubqueryTo(t, 'g1', lineItems);
    expect(next).toBe(t); // unchanged
  });

  it('addEmptySubqueryTo adds a sub-query when a relation field exists', () => {
    const t = tree();
    const orders = SCHEMA[0]!;
    const next = addEmptySubqueryTo(t, 'g1', orders) as Group;
    expect(next.children).toHaveLength(3);
    const added = next.children[2] as SubQueryCondition;
    expect(added.kind).toBe('subquery');
    expect(added.field).toBe('lineItems');
    expect(added.operator).toBe('in');
  });

  it('moveNode with schemaForTarget resets a condition whose field is missing in target', () => {
    const t = tree();
    // Try to move c1 (field=total, op=gt, value=100) into a schema without "total".
    const lineItems = SCHEMA[1]!;
    // Build a target group manually for the test.
    const targetGroup: Group = { kind: 'group', id: 'tg', logic: 'and', children: [] };
    const combined: Group = { kind: 'group', id: 'root', logic: 'and', children: [...t.children, targetGroup] };
    const next = moveNode(combined, 'c1', 'tg', 0, lineItems) as Group;
    const target = next.children.find((c) => c.id === 'tg') as Group;
    const moved = target.children[0] as Condition;
    // "total" not in lineItems → reset to first non-relation field (amount).
    expect(moved.field).toBe('amount');
    expect(moved.value).toBe(null);
  });
});
