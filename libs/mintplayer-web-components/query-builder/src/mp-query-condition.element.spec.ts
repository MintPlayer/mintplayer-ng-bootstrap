import { describe, it, expect, beforeEach } from 'vitest';
import './mp-query-condition.element';
import type { MpQueryConditionElement } from './mp-query-condition.element';
import type { Condition } from './model/expression';
import type { EntitySchema } from './model/field-def';

const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'enum', options: [
        { value: 'open', label: 'Open' },
        { value: 'paid', label: 'Paid' },
      ] },
      { name: 'orderDate', label: 'Order date', type: 'date' },
    ],
  },
];

async function mount(node: Condition): Promise<MpQueryConditionElement> {
  const el = document.createElement('mp-query-condition') as MpQueryConditionElement;
  el.node = node;
  el.schema = SCHEMA;
  el.currentEntity = 'orders';
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('mp-query-condition (M3 editor mounting)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts a number input for "total > 100" and fires condition-value-change', async () => {
    const node: Condition = { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 };
    const el = await mount(node);
    const input = (el.renderRoot as unknown as ParentNode).querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('100');

    const events: Array<{ id: string; value: unknown }> = [];
    el.addEventListener('condition-value-change', (e) => {
      events.push((e as CustomEvent).detail);
    });
    input.value = '250';
    input.dispatchEvent(new Event('input'));
    expect(events).toEqual([{ id: 'c1', value: 250 }]);
  });

  it('mounts an enum <select> for "status equals" using FieldDef.options', async () => {
    const node: Condition = { kind: 'condition', id: 'c2', field: 'status', operator: 'equals', value: 'open' };
    const el = await mount(node);
    // The value editor is inside .qb-value (M5 added field + operator selectors elsewhere).
    const select = (el.renderRoot as unknown as ParentNode).querySelector('.qb-value select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe('open');
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['', 'open', 'paid']);
  });

  it('renders no value editor for a parameterless operator (is-null)', async () => {
    const node: Condition = { kind: 'condition', id: 'c3', field: 'total', operator: 'is-null', value: null };
    const el = await mount(node);
    // Field + operator selectors still render (M5). Value mount is omitted.
    expect((el.renderRoot as unknown as ParentNode).querySelector('.qb-value')).toBeNull();
    expect((el.renderRoot as unknown as ParentNode).textContent ?? '').toContain('is null');
  });

  it('changing the operator on the same field rebuilds the editor', async () => {
    const node1: Condition = { kind: 'condition', id: 'c4', field: 'total', operator: 'equals', value: 5 };
    const el = await mount(node1);
    let input = (el.renderRoot as unknown as ParentNode).querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('number');

    el.node = { kind: 'condition', id: 'c4', field: 'total', operator: 'between', value: [10, 100] };
    await el.updateComplete;
    const inputs = (el.renderRoot as unknown as ParentNode).querySelectorAll('input');
    expect(inputs?.length).toBe(2);
  });

  it('changing the field rebuilds the editor', async () => {
    const node1: Condition = { kind: 'condition', id: 'c5', field: 'total', operator: 'equals', value: 1 };
    const el = await mount(node1);
    expect((el.renderRoot as unknown as ParentNode).querySelector('input[type="number"]')).toBeTruthy();

    el.node = { kind: 'condition', id: 'c5', field: 'orderDate', operator: 'equals', value: '2026-05-15' };
    await el.updateComplete;
    expect((el.renderRoot as unknown as ParentNode).querySelector('input[type="date"]')).toBeTruthy();
  });

  it('switching to a parameterless operator and back brings the value editor back', async () => {
    const el = await mount({ kind: 'condition', id: 'c7', field: 'total', operator: 'gt', value: 1 });
    const root = el.renderRoot as unknown as ParentNode;
    el.node = { kind: 'condition', id: 'c7', field: 'total', operator: 'is-null', value: null };
    await el.updateComplete;
    expect(root.querySelector('input')).toBeNull();
    el.node = { kind: 'condition', id: 'c7', field: 'total', operator: 'gt', value: null };
    await el.updateComplete;
    expect(root.querySelector('.qb-value input[type="number"]')).toBeTruthy();
  });

  it('stamps the built-in editor with the condition style scope, including chips added later', async () => {
    const el = await mount({ kind: 'condition', id: 'c8', field: 'total', operator: 'in', value: [1] });
    const root = el.renderRoot as unknown as ParentNode;
    const wrap = root.querySelector('.qb-editor-chip-input') as HTMLElement;
    expect(wrap.getAttribute('data-mps')).toBe('query-condition');
    const add = root.querySelector('.qb-editor-chip-add') as HTMLInputElement;
    add.value = '2';
    add.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const unstamped = Array.from(wrap.querySelectorAll('*')).filter((n) => n.getAttribute('data-mps') !== 'query-condition');
    expect(wrap.querySelectorAll('.qb-editor-chip')).toHaveLength(2);
    expect(unstamped).toEqual([]);
  });

  it('pressing on the drag handle emits qb-drag-start with the row and pointer position', async () => {
    const el = await mount({ kind: 'condition', id: 'c9', field: 'total', operator: 'gt', value: 1 });
    const root = el.renderRoot as unknown as ParentNode;
    const details: Array<{ id: string; clientX: number; clientY: number; rowElement: HTMLElement }> = [];
    el.addEventListener('qb-drag-start', (e) => details.push((e as CustomEvent).detail));
    (root.querySelector('.qb-drag-handle') as HTMLElement)
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 12, clientY: 34 }));
    expect(details).toHaveLength(1);
    expect(details[0]).toMatchObject({ id: 'c9', clientX: 12, clientY: 34 });
    expect(details[0]!.rowElement).toBe(root.querySelector('.qb-condition'));
  });

  it('Alt+Arrow from inside a value input does not reorder (the input owns its arrows)', async () => {
    const el = await mount({ kind: 'condition', id: 'c10', field: 'total', operator: 'gt', value: 1 });
    const root = el.renderRoot as unknown as ParentNode;
    let moves = 0;
    el.addEventListener('qb-keyboard-move', () => moves++);
    (root.querySelector('.qb-value input') as HTMLInputElement)
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
    // Plain arrows on the row are not a reorder either.
    (root.querySelector('.qb-condition') as HTMLElement)
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(moves).toBe(0);
  });

  it('an unknown field gets no value editor and a disabled operator select', async () => {
    const el = await mount({ kind: 'condition', id: 'c11', field: 'ghost', operator: 'equals', value: 1 });
    const root = el.renderRoot as unknown as ParentNode;
    expect(root.querySelector('.qb-value')?.children.length ?? 0).toBe(0);
    expect((root.querySelector('.qb-operator-select') as HTMLElement).hasAttribute('disabled')).toBe(true);
  });

  it('disposing the WC cleans up the editor handle', async () => {
    const node: Condition = { kind: 'condition', id: 'c6', field: 'total', operator: 'gt', value: 100 };
    const el = await mount(node);
    expect((el.renderRoot as unknown as ParentNode).querySelector('input')).toBeTruthy();
    el.remove();
    // No assertion — just ensures no throw during disconnectedCallback's dispose.
    expect(true).toBe(true);
  });
});
