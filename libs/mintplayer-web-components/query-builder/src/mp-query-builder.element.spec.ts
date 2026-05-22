import { describe, it, expect, beforeEach } from 'vitest';
import './mp-query-builder.element';
import type { MpQueryBuilderElement } from './mp-query-builder.element';
import type { EntitySchema } from './model/field-def';
import { emptyGroup, newId } from './model/default-tree';
import type { Expression } from './model/expression';

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
      { name: 'productName', label: 'Product', type: 'string' },
    ],
  },
];

async function settleDescendants(root: Element): Promise<void> {
  const lit = root as Element & { updateComplete?: Promise<boolean> };
  if (lit.updateComplete) await lit.updateComplete;
  if (root.shadowRoot) {
    for (const child of Array.from(root.shadowRoot.querySelectorAll('*'))) {
      await settleDescendants(child);
    }
  }
}

async function mount(query: Expression, rootEntity = 'orders'): Promise<MpQueryBuilderElement> {
  const el = document.createElement('mp-query-builder') as MpQueryBuilderElement;
  el.query = query;
  el.schema = SCHEMA;
  el.rootEntity = rootEntity;
  document.body.appendChild(el);
  // Run the settle pass twice so newly-mounted descendants get one more chance.
  await settleDescendants(el);
  await settleDescendants(el);
  return el;
}

function shadowText(el: Element): string {
  const parts: string[] = [];
  const visit = (root: ParentNode) => {
    for (const node of Array.from(root.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.textContent ?? '').trim();
        if (t) parts.push(t);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const ele = node as Element;
        if (ele.tagName === 'STYLE') continue;
        if (ele instanceof HTMLInputElement || ele instanceof HTMLSelectElement) {
          if (ele.value) parts.push(ele.value);
        }
        if (ele.shadowRoot) visit(ele.shadowRoot);
        visit(ele);
      }
    }
  };
  if (el.shadowRoot) visit(el.shadowRoot);
  return parts.join(' ');
}

describe('mp-query-builder (M2 read-only rendering)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders an empty group with "(empty group)" placeholder', async () => {
    const el = await mount(emptyGroup('and'));
    const text = shadowText(el);
    expect(text).toContain('AND');
    expect(text).toContain('(empty group)');
  });

  it('renders a flat AND tree with two conditions', async () => {
    const tree: Expression = {
      kind: 'group',
      id: newId(),
      logic: 'and',
      children: [
        { kind: 'condition', id: newId(), field: 'total', operator: 'gt', value: 100 },
        { kind: 'condition', id: newId(), field: 'status', operator: 'equals', value: 'open' },
      ],
    };
    const el = await mount(tree);
    const text = shadowText(el);
    expect(text).toContain('Total');
    expect(text).toContain('>');
    expect(text).toContain('100');
    expect(text).toContain('Status');
    expect(text).toContain('=');
    expect(text).toContain('open');
  });

  it('renders a nested OR group inside an AND', async () => {
    const tree: Expression = {
      kind: 'group',
      id: newId(),
      logic: 'and',
      children: [
        { kind: 'condition', id: newId(), field: 'total', operator: 'gt', value: 100 },
        {
          kind: 'group',
          id: newId(),
          logic: 'or',
          children: [
            { kind: 'condition', id: newId(), field: 'status', operator: 'equals', value: 'open' },
            { kind: 'condition', id: newId(), field: 'status', operator: 'equals', value: 'paid' },
          ],
        },
      ],
    };
    const el = await mount(tree);
    const text = shadowText(el);
    expect(text).toContain('AND');
    expect(text).toContain('OR');
    expect(text).toContain('open');
    expect(text).toContain('paid');
  });

  it('renders array operators with value pills', async () => {
    const tree: Expression = {
      kind: 'group',
      id: newId(),
      logic: 'and',
      children: [
        {
          kind: 'condition',
          id: newId(),
          field: 'tags',
          operator: 'any-of',
          value: ['urgent', 'blocked'],
        },
      ],
    };
    const el = await mount(tree);
    expect(shadowText(el)).toContain('Tags');
    expect(shadowText(el)).toContain('any of');
    expect(shadowText(el)).toContain('urgent');
    expect(shadowText(el)).toContain('blocked');
  });

  it('renders a parameterless operator without a value editor', async () => {
    const tree: Expression = {
      kind: 'group',
      id: newId(),
      logic: 'and',
      children: [
        { kind: 'condition', id: newId(), field: 'status', operator: 'is-null', value: null },
      ],
    };
    const el = await mount(tree);
    const text = shadowText(el);
    expect(text).toContain('Status');
    expect(text).toContain('is null');
  });

  it('renders a sub-query with a recursive mp-query-builder', async () => {
    const tree: Expression = {
      kind: 'group',
      id: newId(),
      logic: 'and',
      children: [
        {
          kind: 'subquery',
          id: newId(),
          field: 'lineItems',
          operator: 'in',
          subQuery: {
            kind: 'group',
            id: newId(),
            logic: 'and',
            children: [
              { kind: 'condition', id: newId(), field: 'amount', operator: 'gt', value: 50 },
            ],
          },
        },
      ],
    };
    const el = await mount(tree);
    // Wait extra ticks for the nested mp-query-builder to render.
    await new Promise((r) => setTimeout(r, 10));
    const text = shadowText(el);
    expect(text).toContain('Line items');
    expect(text).toContain('in');
    expect(text).toContain('Amount');
    expect(text).toContain('50');
  });

  it('renders "Tree too deep" when depth exceeds maxDepth', async () => {
    const el = document.createElement('mp-query-builder') as MpQueryBuilderElement;
    el.query = emptyGroup('and');
    el.schema = SCHEMA;
    el.rootEntity = 'orders';
    el.maxDepth = 5;
    el.depth = 10;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot?.textContent).toContain('Tree too deep');
  });

  it('shows the unknown field name as the selected option when the field is not in the schema', async () => {
    const tree: Expression = {
      kind: 'group',
      id: newId(),
      logic: 'and',
      children: [
        { kind: 'condition', id: newId(), field: 'nonexistent', operator: 'equals', value: 'x' },
      ],
    };
    const el = await mount(tree);
    // The condition's field-selector should include an option with the unknown
    // name in parens — the user can see "this is unknown" and pick a real one.
    // shadowText joins with spaces, so the parens are surrounded by them.
    expect(shadowText(el)).toMatch(/\(\s*nonexistent\s*\)/);
  });
});
