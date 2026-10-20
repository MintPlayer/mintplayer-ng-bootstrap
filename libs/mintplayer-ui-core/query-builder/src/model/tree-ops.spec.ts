import { describe, it, expect } from 'vitest';
import type { Condition, Expression, Group, SubQueryCondition } from './expression';
import type { EntitySchema, FieldDef } from './field-def';
import {
  addChild,
  addEmptyConditionTo,
  addEmptyGroupTo,
  addEmptySubqueryTo,
  changeConditionField,
  changeConditionOperator,
  collectDescendantIds,
  findNodeById,
  findParentGroup,
  moveNode,
  removeNode,
  setGroupLogic,
  updateCondition,
} from './tree-ops';

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

/** Root → [c1, sq(lineItems) → sg → [inner], g2 → [c2]]. */
function treeWithSubquery(): Group {
  const inner: Condition = { kind: 'condition', id: 'inner', field: 'amount', operator: 'gt', value: 5 };
  const sub: SubQueryCondition = {
    kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
    subQuery: { kind: 'group', id: 'sg', logic: 'and', children: [inner] },
  };
  const t = tree();
  return { ...t, children: [t.children[0]!, sub, t.children[1]!] };
}

const field = (name: string): FieldDef =>
  SCHEMA.flatMap((e) => e.fields).find((f) => f.name === name)!;

describe('tree-ops: sub-query bodies', () => {
  it('removing a sub-query body leaves an empty AND body, never a sub-query without one', () => {
    const next = removeNode(treeWithSubquery(), 'sg') as Group;
    const sq = next.children[1] as SubQueryCondition;
    expect(sq.kind).toBe('subquery');
    expect(sq.subQuery.kind).toBe('group');
    expect(sq.subQuery.logic).toBe('and');
    expect(sq.subQuery.children).toEqual([]);
    expect(sq.subQuery.id).not.toBe('sg');
  });

  it('removing a node inside a sub-query body keeps the body and its id', () => {
    const next = removeNode(treeWithSubquery(), 'inner') as Group;
    const sq = next.children[1] as SubQueryCondition;
    expect(sq.subQuery.id).toBe('sg');
    expect(sq.subQuery.children).toEqual([]);
  });

  it('collectDescendantIds descends through a sub-query into its body', () => {
    expect([...collectDescendantIds(treeWithSubquery())].sort())
      .toEqual(['c1', 'c2', 'g1', 'g2', 'inner', 'sg', 'sq']);
  });

  it('collectDescendantIds of a leaf condition is just its own id', () => {
    expect([...collectDescendantIds(tree().children[0]!)]).toEqual(['c1']);
  });
});

describe('tree-ops: findParentGroup', () => {
  it('returns the direct parent and the index of the node in it', () => {
    const found = findParentGroup(tree(), 'g2');
    expect(found?.parent.id).toBe('g1');
    expect(found?.index).toBe(1);
  });

  it('finds the parent of a node nested in a child group', () => {
    const found = findParentGroup(tree(), 'c2');
    expect(found?.parent.id).toBe('g2');
    expect(found?.index).toBe(0);
  });

  it('finds the body group as the parent of a node inside a sub-query', () => {
    const found = findParentGroup(treeWithSubquery(), 'inner');
    expect(found?.parent.id).toBe('sg');
    expect(found?.index).toBe(0);
  });

  it('returns null for the root and for an unknown id', () => {
    expect(findParentGroup(tree(), 'g1')).toBeNull();
    expect(findParentGroup(tree(), 'missing')).toBeNull();
  });

  it('returns null when the tree itself is a condition', () => {
    expect(findParentGroup(tree().children[0]!, 'c1')).toBeNull();
  });
});

describe('tree-ops: updateCondition', () => {
  it('patches field and operator of a condition, leaving the rest', () => {
    const next = updateCondition(tree(), 'c1', { field: 'status', operator: 'equals' }) as Group;
    expect(next.children[0]).toEqual({ kind: 'condition', id: 'c1', field: 'status', operator: 'equals', value: 100 });
  });

  it('a sub-query accepts a new field and the in/not-in operators', () => {
    const next = updateCondition(treeWithSubquery(), 'sq', { field: 'other', operator: 'not-in' }) as Group;
    const sq = next.children[1] as SubQueryCondition;
    expect(sq.field).toBe('other');
    expect(sq.operator).toBe('not-in');
    expect(sq.subQuery.id).toBe('sg');
  });

  it('a sub-query ignores any other operator and any value patch', () => {
    const next = updateCondition(treeWithSubquery(), 'sq', { operator: 'equals', value: 42 }) as Group;
    const sq = next.children[1] as SubQueryCondition;
    expect(sq.operator).toBe('in');
    expect('value' in sq).toBe(false);
  });

  it('a field-only patch on a sub-query keeps its operator', () => {
    const next = updateCondition(treeWithSubquery(), 'sq', { field: 'other' }) as Group;
    expect(next.children[1]).toMatchObject({ field: 'other', operator: 'in' });
  });

  it('removeNode on the root id returns the tree itself (the root cannot be removed)', () => {
    const t = tree();
    expect(removeNode(t, 'g1')).toBe(t);
  });

  it('an empty patch yields an equal condition', () => {
    const next = updateCondition(tree(), 'c1', {}) as Group;
    expect(next.children[0]).toEqual(tree().children[0]);
  });
});

describe('tree-ops: field and operator changes', () => {
  it('changeConditionField keeps an operator the new type allows, and its value', () => {
    // total > 100 → orderDate: dates allow gt, so the comparison survives the switch.
    const next = changeConditionField(tree(), 'c1', field('orderDate')) as Group;
    expect(next.children[0]).toMatchObject({ field: 'orderDate', operator: 'gt', value: 100 });
  });

  it('changeConditionField to a relation field falls back to "in" with an empty list', () => {
    const next = changeConditionField(tree(), 'c1', field('lineItems')) as Group;
    expect(next.children[0]).toMatchObject({ field: 'lineItems', operator: 'in', value: [] });
  });

  it('changeConditionField falls back to "equals" for a type with no operators', () => {
    const unknown = { name: 'x', label: 'X', type: 'mystery' } as unknown as FieldDef;
    const next = changeConditionField(tree(), 'c1', unknown) as Group;
    expect(next.children[0]).toMatchObject({ field: 'x', operator: 'equals', value: null });
  });

  it('changeConditionField ignores ids that are not conditions', () => {
    const t = tree();
    expect(changeConditionField(t, 'g2', field('status'))).toEqual(t);
  });

  it('changeConditionOperator ignores ids that are not conditions', () => {
    const t = tree();
    expect(changeConditionOperator(t, 'g2', 'between')).toEqual(t);
  });

  it('changeConditionOperator gives an n-input operator its { n: 1 } default', () => {
    const next = changeConditionOperator(tree(), 'c1', 'last-n-days') as Group;
    expect((next.children[0] as Condition).value).toEqual({ n: 1 });
  });
});

describe('tree-ops: moveNode guards and placement', () => {
  it('returns the same tree when the source does not exist', () => {
    const t = tree();
    expect(moveNode(t, 'missing', 'g1', 0)).toBe(t);
  });

  it('returns the same tree when the target is missing or not a group', () => {
    const t = tree();
    expect(moveNode(t, 'c1', 'missing', 0)).toBe(t);
    expect(moveNode(t, 'c1', 'c2', 0)).toBe(t);
  });

  it('refuses to move a group into its own descendant', () => {
    const t: Group = { kind: 'group', id: 'r', logic: 'and', children: [tree()] };
    expect(moveNode(t, 'g1', 'g2', 0)).toBe(t);
  });

  it('clamps a negative index to the front and an oversized one to the end', () => {
    const front = moveNode(tree(), 'c2', 'g1', -5) as Group;
    expect(front.children.map((c) => c.id)).toEqual(['c2', 'c1', 'g2']);
    const end = moveNode(tree(), 'c2', 'g1', 99) as Group;
    expect(end.children.map((c) => c.id)).toEqual(['c1', 'g2', 'c2']);
  });

  it('moves a node out of a sub-query body into the outer tree', () => {
    const next = moveNode(treeWithSubquery(), 'inner', 'g1', 0) as Group;
    expect(next.children.map((c) => c.id)).toEqual(['inner', 'c1', 'sq', 'g2']);
    expect((next.children[2] as SubQueryCondition).subQuery.children).toEqual([]);
  });
});

describe('tree-ops: moveNode with a target schema', () => {
  const target = (t: Group): Group =>
    ({ kind: 'group', id: 'root', logic: 'and', children: [t, { kind: 'group', id: 'tg', logic: 'and', children: [] }] });
  const moved = (next: Expression): Expression =>
    ((next as Group).children[1] as Group).children[0]!;

  it('keeps a condition whose field exists in the target and whose operator is still allowed', () => {
    const schema: EntitySchema = { name: 's', label: 'S', fields: [{ name: 'total', label: 'T', type: 'integer' }] };
    const next = moveNode(target(tree()), 'c1', 'tg', 0, schema);
    expect(moved(next)).toEqual({ kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 });
  });

  it('resets the operator and value when the target type no longer allows the operator', () => {
    const schema: EntitySchema = { name: 's', label: 'S', fields: [{ name: 'total', label: 'T', type: 'boolean' }] };
    const next = moveNode(target(tree()), 'c1', 'tg', 0, schema);
    expect(moved(next)).toMatchObject({ field: 'total', operator: 'is-true', value: null });
  });

  it('treats a same-named relation field in the target as missing', () => {
    const schema: EntitySchema = {
      name: 's', label: 'S',
      fields: [
        { name: 'total', label: 'T', type: 'relation', targetEntity: 'x' },
        { name: 'label', label: 'L', type: 'string' },
      ],
    };
    const next = moveNode(target(tree()), 'c1', 'tg', 0, schema);
    expect(moved(next)).toMatchObject({ field: 'label', operator: 'equals', value: null });
  });

  it('leaves a condition untouched when the target has no non-relation field to fall back to', () => {
    const schema: EntitySchema = { name: 's', label: 'S', fields: [{ name: 'r', label: 'R', type: 'relation', targetEntity: 'x' }] };
    const next = moveNode(target(tree()), 'c1', 'tg', 0, schema);
    expect(moved(next)).toEqual(tree().children[0]);
  });

  it('resets a missing field to the fallback field with "equals" when its type has no operators', () => {
    const schema: EntitySchema = { name: 's', label: 'S', fields: [{ name: 'odd', label: 'O', type: 'mystery' as never }] };
    const next = moveNode(target(tree()), 'c1', 'tg', 0, schema);
    expect(moved(next)).toMatchObject({ field: 'odd', operator: 'equals', value: null });
  });

  it('reshapes every condition inside a moved group, keeping the group structure', () => {
    const next = moveNode(target(tree()), 'g2', 'tg', 0, SCHEMA[1]);
    const g2 = moved(next) as Group;
    expect(g2).toMatchObject({ kind: 'group', id: 'g2', logic: 'or' });
    expect(g2.children[0]).toMatchObject({ id: 'c2', field: 'amount', operator: 'equals', value: null });
  });

  it('moves a sub-query as-is, since its body is rooted on another entity', () => {
    const next = moveNode(target(treeWithSubquery()), 'sq', 'tg', 0, SCHEMA[1]);
    expect(moved(next)).toEqual(treeWithSubquery().children[1]);
  });
});
