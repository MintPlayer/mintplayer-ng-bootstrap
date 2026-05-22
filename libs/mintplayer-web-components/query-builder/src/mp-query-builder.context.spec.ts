import { describe, it, expect, beforeEach } from 'vitest';
import './mp-query-builder.element';
import type { MpQueryBuilderElement } from './mp-query-builder.element';
import type { Expression, Group } from './model/expression';
import type { EntitySchema } from './model/field-def';

const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'string' },
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

async function mount(tree: Expression, configure: (el: MpQueryBuilderElement) => void = () => undefined): Promise<MpQueryBuilderElement> {
  const el = document.createElement('mp-query-builder') as MpQueryBuilderElement;
  el.schema = SCHEMA;
  el.rootEntity = 'orders';
  el.query = tree;
  configure(el);
  document.body.appendChild(el);
  await settle(el);
  await settle(el);
  return el;
}

describe('mp-query-builder Lit context propagation (M7)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('outer disabled=true disables the inner sub-query controls (OR semantics)', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: {
            kind: 'group', id: 'sg', logic: 'and',
            children: [{ kind: 'condition', id: 'sc', field: 'amount', operator: 'gt', value: 50 }],
          },
        },
      ],
    };
    const el = await mount(tree, (b) => { b.disabled = true; });

    // The inner condition's field/operator selects + value editor should all be disabled.
    const selects = deepFindAll(el, '.qb-field-select, .qb-operator-select') as HTMLSelectElement[];
    expect(selects.length).toBeGreaterThanOrEqual(2);
    for (const s of selects) {
      expect(s.disabled).toBe(true);
    }
    const editorInputs = deepFindAll(el, 'input[type="number"]') as HTMLInputElement[];
    for (const i of editorInputs) {
      expect(i.disabled).toBe(true);
    }
  });

  it('outer messages override inner condition operator labels (merge semantics)', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: {
            kind: 'group', id: 'sg', logic: 'and',
            children: [{ kind: 'condition', id: 'sc', field: 'amount', operator: 'gt', value: 50 }],
          },
        },
      ],
    };
    const el = await mount(tree, (b) => {
      b.messages = {
        operators: { 'gt': 'GREATER-THAN-CUSTOM' },
      };
    });

    // The inner condition's operator <select> should contain the custom label.
    const ops = deepFindAll(el, '.qb-operator-select') as HTMLSelectElement[];
    const labels = ops.flatMap((s) => Array.from(s.options).map((o) => o.textContent));
    expect(labels).toContain('GREATER-THAN-CUSTOM');
  });

  it('reactive update: toggling outer disabled propagates to inner controls', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: {
            kind: 'group', id: 'sg', logic: 'and',
            children: [{ kind: 'condition', id: 'sc', field: 'amount', operator: 'gt', value: 50 }],
          },
        },
      ],
    };
    const el = await mount(tree);

    let selects = deepFindAll(el, '.qb-field-select') as HTMLSelectElement[];
    expect(selects.some((s) => s.disabled)).toBe(false);

    el.disabled = true;
    await settle(el);
    await settle(el);

    selects = deepFindAll(el, '.qb-field-select') as HTMLSelectElement[];
    expect(selects.every((s) => s.disabled)).toBe(true);
  });

  it('depth tracking: outer renders the root group, inner sub-query renders an inner mp-query-builder', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: { kind: 'group', id: 'sg', logic: 'and', children: [] },
        },
      ],
    };
    const el = await mount(tree);
    const builders = deepFindAll(el, 'mp-query-builder');
    // There should be ONE inner mp-query-builder (in addition to `el` itself).
    expect(builders.length).toBe(1);
    const inner = builders[0] as MpQueryBuilderElement;
    expect(inner.depth).toBeGreaterThan(0);
    expect(inner.rootEntity).toBe('lineItems');
  });

  it('respects maxDepth: an over-deep tree shows the "Tree too deep" placeholder', async () => {
    // Construct a nested-sub-query chain with maxDepth=2 → 3 levels triggers the placeholder.
    const inner: Group = { kind: 'group', id: 'gi', logic: 'and', children: [] };
    const sub: Expression = {
      kind: 'subquery', id: 'sqi', field: 'lineItems', operator: 'in',
      subQuery: inner,
    };
    const tree: Group = { kind: 'group', id: 'g1', logic: 'and', children: [sub] };
    const el = await mount(tree, (b) => { b.maxDepth = 0; });
    // Inner mp-query-builder gets depth=1 (from sub-query), maxDepth=0 → over.
    // The outer renders normally; the inner shows the placeholder.
    const builders = deepFindAll(el, 'mp-query-builder');
    expect(builders.length).toBe(1);
    const inner_b = builders[0] as MpQueryBuilderElement;
    expect(inner_b.shadowRoot?.textContent ?? '').toContain('Tree too deep');
  });

  it('inner mp-query-builder does NOT mutate the tree directly — events bubble to the outer', async () => {
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

    // Find the inner mp-query-builder; assert its `query` property points to
    // the sub-tree from the OUTER tree. Mutations via tree-ops should appear
    // in the outer's `query`, not as a separate inner.query.
    const innerBuilder = deepFindAll(el, 'mp-query-builder')[0] as MpQueryBuilderElement;
    expect(innerBuilder.query?.id).toBe('sg');

    // Type into the value editor inside the inner sub-query.
    const innerInputs = deepFindAll(el, 'input[type="number"]') as HTMLInputElement[];
    expect(innerInputs.length).toBeGreaterThan(0);
    innerInputs[innerInputs.length - 1]!.value = '999';
    innerInputs[innerInputs.length - 1]!.dispatchEvent(new Event('input'));
    await settle(el);
    await settle(el);

    // The OUTER el.query is now mutated.
    const sq = (el.query as Group).children[0] as { subQuery: Group };
    const sc = sq.subQuery.children[0] as { value: number };
    expect(sc.value).toBe(999);
  });
});
