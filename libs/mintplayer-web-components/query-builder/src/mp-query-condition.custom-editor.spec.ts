import { describe, it, expect, beforeEach } from 'vitest';
import './mp-query-builder.element';
import './mp-query-condition.element';
import type { MpQueryBuilderElement } from './mp-query-builder.element';
import type { Condition } from './model/expression';
import type { EntitySchema } from './model/field-def';
import type { EditorContext, EditorFactory, EditorHandle, EditorRegistry } from './model/editor';
const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'orderDate', label: 'Order date', type: 'date' },
    ],
  },
];

function condition(field: string, value: unknown, op: Condition['operator'] = 'equals'): Condition {
  return { kind: 'condition', id: 'c1', field, operator: op, value };
}

async function settleDescendants(root: Element): Promise<void> {
  const lit = root as Element & { updateComplete?: Promise<boolean> };
  if (lit.updateComplete) await lit.updateComplete;
  if (root.shadowRoot) {
    for (const child of Array.from(root.shadowRoot.querySelectorAll('*'))) {
      await settleDescendants(child);
    }
  }
}

function deepFind(root: Element, tag: string): Element | null {
  const stack: Array<Element | ShadowRoot> = [root];
  if (root.shadowRoot) stack.push(root.shadowRoot);
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const el of Array.from(cur.querySelectorAll(tag))) return el;
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

interface FactoryStats {
  factory: EditorFactory;
  built: number;
  disposed: number;
  lastHandle: EditorHandle | null;
}

function trackingFactory(label: string): FactoryStats {
  const stats: FactoryStats = { factory: () => ({ element: document.createElement('div') }), built: 0, disposed: 0, lastHandle: null };
  stats.factory = (ctx: EditorContext): EditorHandle => {
    stats.built++;
    const el = document.createElement('span');
    el.className = 'custom-editor';
    el.dataset['label'] = label;
    el.dataset['field'] = ctx.field.name;
    el.dataset['value'] = JSON.stringify(ctx.value);
    const handle: EditorHandle = {
      element: el,
      dispose: () => { stats.disposed++; },
    };
    stats.lastHandle = handle;
    return handle;
  };
  return stats;
}

describe('mp-query-condition with editorRegistry (M4 custom editors)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('falls back to built-in editor when registry has no entry for the field', async () => {
    const builder = document.createElement('mp-query-builder') as MpQueryBuilderElement;
    builder.schema = SCHEMA;
    builder.rootEntity = 'orders';
    builder.editorRegistry = {};
    builder.query = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [condition('total', 100)],
    };
    document.body.appendChild(builder);
    await settleDescendants(builder);
    await settleDescendants(builder);

    const cond = deepFind(builder, 'mp-query-condition');
    expect(cond?.shadowRoot?.querySelector('input[type="number"]')).toBeTruthy();
    expect(cond?.shadowRoot?.querySelector('.custom-editor')).toBeNull();
  });

  it('uses the registered factory when provided for the field', async () => {
    const totalEditor = trackingFactory('total-custom');
    const registry: EditorRegistry = { total: totalEditor.factory };
    const builder = document.createElement('mp-query-builder') as MpQueryBuilderElement;
    builder.schema = SCHEMA;
    builder.rootEntity = 'orders';
    builder.editorRegistry = registry;
    builder.query = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [condition('total', 100)],
    };
    document.body.appendChild(builder);
    await settleDescendants(builder);
    await settleDescendants(builder);

    expect(totalEditor.built).toBe(1);
    expect(totalEditor.disposed).toBe(0);
    const cond = deepFind(builder, 'mp-query-condition');
    const custom = cond?.shadowRoot?.querySelector('.custom-editor') as HTMLElement;
    expect(custom).toBeTruthy();
    expect(custom.dataset['field']).toBe('total');
    expect(custom.dataset['value']).toBe('100');
    expect(cond?.shadowRoot?.querySelector('input[type="number"]')).toBeNull();
  });

  it('disposes the registered factory handle when the WC is removed', async () => {
    const totalEditor = trackingFactory('total-custom');
    const builder = document.createElement('mp-query-builder') as MpQueryBuilderElement;
    builder.schema = SCHEMA;
    builder.rootEntity = 'orders';
    builder.editorRegistry = { total: totalEditor.factory };
    builder.query = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [condition('total', 100)],
    };
    document.body.appendChild(builder);
    await settleDescendants(builder);
    await settleDescendants(builder);

    expect(totalEditor.built).toBe(1);
    expect(totalEditor.disposed).toBe(0);
    builder.remove();
    expect(totalEditor.disposed).toBe(1);
  });

  it('disposes the previous handle and rebuilds when the registry is replaced with a new factory', async () => {
    const editorA = trackingFactory('A');
    const editorB = trackingFactory('B');
    const builder = document.createElement('mp-query-builder') as MpQueryBuilderElement;
    builder.schema = SCHEMA;
    builder.rootEntity = 'orders';
    builder.editorRegistry = { total: editorA.factory };
    builder.query = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [condition('total', 100)],
    };
    document.body.appendChild(builder);
    await settleDescendants(builder);
    await settleDescendants(builder);

    expect(editorA.built).toBe(1);
    expect(editorB.built).toBe(0);

    // Swap to a different registry instance with a different factory.
    builder.editorRegistry = { total: editorB.factory };
    await settleDescendants(builder);
    await settleDescendants(builder);

    expect(editorA.disposed).toBe(1);
    expect(editorB.built).toBe(1);
    const cond = deepFind(builder, 'mp-query-condition');
    expect((cond?.shadowRoot?.querySelector('.custom-editor') as HTMLElement).dataset['label']).toBe('B');
  });

  it('propagates editorRegistry into a nested sub-query body (read-through context)', async () => {
    const SCHEMA2: EntitySchema[] = [
      ...SCHEMA,
      {
        name: 'lineItems',
        label: 'Line items',
        fields: [
          { name: 'amount', label: 'Amount', type: 'number' },
        ],
      },
    ];
    SCHEMA2[0]!.fields.push({ name: 'lineItems', label: 'Line items', type: 'relation', targetEntity: 'lineItems' });
    const amountEditor = trackingFactory('amount-custom');
    const builder = document.createElement('mp-query-builder') as MpQueryBuilderElement;
    builder.schema = SCHEMA2;
    builder.rootEntity = 'orders';
    builder.editorRegistry = { amount: amountEditor.factory };
    builder.query = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq1', field: 'lineItems', operator: 'in',
          subQuery: {
            kind: 'group', id: 'g2', logic: 'and',
            children: [{ kind: 'condition', id: 'c-amount', field: 'amount', operator: 'gt', value: 50 }],
          },
        },
      ],
    };
    document.body.appendChild(builder);
    await settleDescendants(builder);
    await settleDescendants(builder);
    await settleDescendants(builder);

    expect(amountEditor.built).toBe(1);
    // The custom editor for `amount` should be rendered inside the inner sub-query's mp-query-condition,
    // proving the registry travelled through the nested mp-query-builder context boundary.
    const allCustoms = deepFindAll(builder, '.custom-editor');
    const matched = allCustoms.find((el) => (el as HTMLElement).dataset['field'] === 'amount');
    expect(matched).toBeTruthy();
  });
});
