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

function rowFor(el: Element, conditionId: string): HTMLElement {
  const row = deepFindAll(el, `[data-row-id="${conditionId}"]`)[0] as HTMLElement | undefined;
  if (!row) throw new Error(`row for ${conditionId} not found`);
  return row;
}

describe('mp-query-builder (FR-33 Alt+Arrow keyboard reorder)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const threeConditions = (): Group => ({
    kind: 'group', id: 'g1', logic: 'and',
    children: [
      { kind: 'condition', id: 'c1', field: 'total', operator: 'equals', value: 1 },
      { kind: 'condition', id: 'c2', field: 'total', operator: 'equals', value: 2 },
      { kind: 'condition', id: 'c3', field: 'total', operator: 'equals', value: 3 },
    ],
  });

  it('Alt+ArrowDown on a middle row moves it past its next sibling', async () => {
    const el = await mount(threeConditions());
    const row = rowFor(el, 'c2');
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', altKey: true, bubbles: true, composed: true,
    }));
    await settle(el);
    const ids = (el.query as Group).children.map((c) => c.id);
    expect(ids).toEqual(['c1', 'c3', 'c2']);
    // Value preserved.
    const moved = (el.query as Group).children[2] as Condition;
    expect(moved.value).toBe(2);
  });

  it('Alt+ArrowUp on a middle row moves it past its previous sibling', async () => {
    const el = await mount(threeConditions());
    const row = rowFor(el, 'c2');
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowUp', altKey: true, bubbles: true, composed: true,
    }));
    await settle(el);
    expect((el.query as Group).children.map((c) => c.id)).toEqual(['c2', 'c1', 'c3']);
  });

  it('Alt+ArrowUp on the first row is a no-op', async () => {
    const el = await mount(threeConditions());
    const row = rowFor(el, 'c1');
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowUp', altKey: true, bubbles: true, composed: true,
    }));
    await settle(el);
    expect((el.query as Group).children.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('Alt+ArrowDown on the last row is a no-op', async () => {
    const el = await mount(threeConditions());
    const row = rowFor(el, 'c3');
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', altKey: true, bubbles: true, composed: true,
    }));
    await settle(el);
    expect((el.query as Group).children.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('ArrowDown without Alt is ignored (no reorder)', async () => {
    const el = await mount(threeConditions());
    const row = rowFor(el, 'c1');
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', altKey: false, bubbles: true, composed: true,
    }));
    await settle(el);
    expect((el.query as Group).children.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('Alt+ArrowDown fired from a child input is ignored (path[0] !== row)', async () => {
    const el = await mount(threeConditions());
    const row = rowFor(el, 'c1');
    // Find an inner input/select inside the same row's shadow root.
    const inner = row.shadowRoot?.querySelector('select') ?? row.querySelector('select');
    expect(inner).toBeTruthy();
    inner!.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', altKey: true, bubbles: true, composed: true,
    }));
    await settle(el);
    expect((el.query as Group).children.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });
});
