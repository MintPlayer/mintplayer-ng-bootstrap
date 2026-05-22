import { describe, it, expect, beforeEach } from 'vitest';
import './mp-query-builder.element';
import type { MpQueryBuilderElement } from './mp-query-builder.element';
import type { Condition, Expression, Group } from './model/expression';
import type { EntitySchema } from './model/field-def';

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
    ],
  },
];

async function settle(el: Element): Promise<void> {
  const lit = el as Element & { updateComplete?: Promise<boolean> };
  if (lit.updateComplete) await lit.updateComplete;
  if (el.shadowRoot) {
    for (const child of Array.from(el.shadowRoot.querySelectorAll('*'))) {
      await settle(child);
    }
  }
}

async function mount(query: Expression): Promise<MpQueryBuilderElement> {
  const el = document.createElement('mp-query-builder') as MpQueryBuilderElement;
  el.schema = SCHEMA;
  el.rootEntity = 'orders';
  el.query = query;
  document.body.appendChild(el);
  await settle(el);
  await settle(el);
  return el;
}

function deepFind(root: Element, selector: string): Element | null {
  const stack: Array<Element | ShadowRoot> = [root];
  if (root.shadowRoot) stack.push(root.shadowRoot);
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const el of Array.from(cur.querySelectorAll(selector))) return el;
    for (const el of Array.from(cur.querySelectorAll('*'))) {
      if (el.shadowRoot) stack.push(el.shadowRoot);
    }
  }
  return null;
}

function deepFindAll(root: Element, selector: string): Element[] {
  const out: Element[] = [];
  const stack: Array<Element | ShadowRoot> = [root];
  if (root.shadowRoot) stack.push(root.shadowRoot);
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const el of Array.from(cur.querySelectorAll(selector))) out.push(el);
    for (const el of Array.from(cur.querySelectorAll('*'))) {
      if (el.shadowRoot) stack.push(el.shadowRoot);
    }
  }
  return out;
}

describe('mp-query-builder (M5 edit flow)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('clicking + Add condition appends a default condition to the root group', async () => {
    const el = await mount({ kind: 'group', id: 'g1', logic: 'and', children: [] });
    const addBtn = deepFind(el, '.qb-add-condition') as HTMLButtonElement;
    addBtn.click();
    await settle(el);
    const tree = el.query as Group;
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]?.kind).toBe('condition');
    expect((tree.children[0] as Condition).field).toBe('total');
  });

  it('clicking the OR button flips group logic', async () => {
    const el = await mount({ kind: 'group', id: 'g1', logic: 'and', children: [] });
    const orBtn = deepFindAll(el, '.qb-logic-btn').find((b) => b.textContent === 'OR') as HTMLButtonElement;
    orBtn.click();
    await settle(el);
    expect((el.query as Group).logic).toBe('or');
  });

  it('changing the operator dropdown patches the condition', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [{ kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 }],
    };
    const el = await mount(tree);
    const opSelect = deepFind(el, '.qb-operator-select') as HTMLSelectElement;
    opSelect.value = 'between';
    opSelect.dispatchEvent(new Event('change'));
    await settle(el);
    const c1 = (el.query as Group).children[0] as Condition;
    expect(c1.operator).toBe('between');
    expect(c1.value).toEqual([null, null]); // reset because shape changed
  });

  it('changing the field dropdown patches the condition and resets shape-mismatched value', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [{ kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 }],
    };
    const el = await mount(tree);
    const fieldSelect = deepFind(el, '.qb-field-select') as HTMLSelectElement;
    fieldSelect.value = 'status';
    fieldSelect.dispatchEvent(new Event('change'));
    await settle(el);
    const c1 = (el.query as Group).children[0] as Condition;
    expect(c1.field).toBe('status');
    expect(c1.operator).toBe('equals');
    expect(c1.value).toBe(null);
  });

  it('typing into the value input patches the condition value', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [{ kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 }],
    };
    const el = await mount(tree);
    const input = deepFind(el, 'input[type="number"]') as HTMLInputElement;
    input.value = '500';
    input.dispatchEvent(new Event('input'));
    await settle(el);
    const c1 = (el.query as Group).children[0] as Condition;
    expect(c1.value).toBe(500);
  });

  it('clicking the remove button on a condition removes it from the tree', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 },
        { kind: 'condition', id: 'c2', field: 'status', operator: 'equals', value: 'open' },
      ],
    };
    const el = await mount(tree);
    // Find c1's remove specifically (the one inside the mp-query-condition with the matching node).
    const conditions = deepFindAll(el, 'mp-query-condition');
    expect(conditions.length).toBe(2);
    const c1Cond = conditions.find((c) => (c as Element & { node?: { id: string } }).node?.id === 'c1')!;
    const c1Remove = c1Cond.shadowRoot?.querySelector('.qb-remove') as HTMLButtonElement;
    c1Remove.click();
    await settle(el);
    const next = el.query as Group;
    expect(next.children).toHaveLength(1);
    expect((next.children[0] as Condition).id).toBe('c2');
  });

  it('removing the root group is a no-op (root is always present)', async () => {
    const t: Group = { kind: 'group', id: 'g1', logic: 'and', children: [] };
    const el = await mount(t);
    // The root has no "remove group" button (isRoot disables it). Try
    // synthesizing a node-remove event with the root id directly.
    el.shadowRoot
      ?.querySelector('.qb-root')
      ?.dispatchEvent(new CustomEvent('node-remove', { detail: { id: 'g1' }, bubbles: true, composed: true }));
    await settle(el);
    expect((el.query as Group).id).toBe('g1');
  });

  it('fires query-change when a mutation happens', async () => {
    const el = await mount({ kind: 'group', id: 'g1', logic: 'and', children: [] });
    let fired = 0;
    el.addEventListener('query-change', () => fired++);
    const addBtn = deepFind(el, '.qb-add-condition') as HTMLButtonElement;
    addBtn.click();
    await settle(el);
    expect(fired).toBe(1);
  });

  it('mutating a condition inside a sub-query resolves the right entity context', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: {
            kind: 'group', id: 'sg', logic: 'and',
            children: [{ kind: 'condition', id: 'sc', field: 'amount', operator: 'gt', value: 5 }],
          },
        },
      ],
    };
    const el = await mount(tree);
    // Find the value input inside the sub-query and change it.
    const inputs = deepFindAll(el, 'input[type="number"]') as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThan(0);
    const innerInput = inputs[inputs.length - 1]!;
    innerInput.value = '99';
    innerInput.dispatchEvent(new Event('input'));
    await settle(el);
    const sq = (el.query as Group).children[0] as { subQuery: Group };
    const sc = sq.subQuery.children[0] as Condition;
    expect(sc.value).toBe(99);
  });
});
