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
    const input = el.shadowRoot?.querySelector('input[type="number"]') as HTMLInputElement;
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
    const select = el.shadowRoot?.querySelector('.qb-value select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe('open');
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['', 'open', 'paid']);
  });

  it('renders no value editor for a parameterless operator (is-null)', async () => {
    const node: Condition = { kind: 'condition', id: 'c3', field: 'total', operator: 'is-null', value: null };
    const el = await mount(node);
    // Field + operator selectors still render (M5). Value mount is omitted.
    expect(el.shadowRoot?.querySelector('.qb-value')).toBeNull();
    expect(el.shadowRoot?.textContent ?? '').toContain('is null');
  });

  it('changing the operator on the same field rebuilds the editor', async () => {
    const node1: Condition = { kind: 'condition', id: 'c4', field: 'total', operator: 'equals', value: 5 };
    const el = await mount(node1);
    let input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('number');

    el.node = { kind: 'condition', id: 'c4', field: 'total', operator: 'between', value: [10, 100] };
    await el.updateComplete;
    const inputs = el.shadowRoot?.querySelectorAll('input');
    expect(inputs?.length).toBe(2);
  });

  it('changing the field rebuilds the editor', async () => {
    const node1: Condition = { kind: 'condition', id: 'c5', field: 'total', operator: 'equals', value: 1 };
    const el = await mount(node1);
    expect(el.shadowRoot?.querySelector('input[type="number"]')).toBeTruthy();

    el.node = { kind: 'condition', id: 'c5', field: 'orderDate', operator: 'equals', value: '2026-05-15' };
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('input[type="date"]')).toBeTruthy();
  });

  it('disposing the WC cleans up the editor handle', async () => {
    const node: Condition = { kind: 'condition', id: 'c6', field: 'total', operator: 'gt', value: 100 };
    const el = await mount(node);
    expect(el.shadowRoot?.querySelector('input')).toBeTruthy();
    el.remove();
    // No assertion — just ensures no throw during disconnectedCallback's dispose.
    expect(true).toBe(true);
  });
});
