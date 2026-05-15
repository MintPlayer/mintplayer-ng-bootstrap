import { describe, it, expect, beforeEach } from 'vitest';
import './mp-query-builder.element';
import type { MpQueryBuilderElement } from './mp-query-builder.element';
import type { EntitySchema } from '../model/field-def';
import { emptyGroup } from '../model/default-tree';

const MULTI_SCHEMA: EntitySchema[] = [
  { name: 'orders', label: 'Orders', fields: [{ name: 'total', label: 'Total', type: 'number' }] },
  { name: 'customers', label: 'Customers', fields: [{ name: 'name', label: 'Name', type: 'string' }] },
];

const SINGLE_SCHEMA: EntitySchema[] = [MULTI_SCHEMA[0]!];

async function settle(el: Element): Promise<void> {
  const lit = el as Element & { updateComplete?: Promise<boolean> };
  if (lit.updateComplete) await lit.updateComplete;
  if (el.shadowRoot) {
    for (const child of Array.from(el.shadowRoot.querySelectorAll('*'))) {
      await settle(child);
    }
  }
}

async function mount(opts: { schema: EntitySchema[]; rootEntity: string; multiEntityPickerEnabled: boolean }): Promise<MpQueryBuilderElement> {
  const el = document.createElement('mp-query-builder') as MpQueryBuilderElement;
  el.schema = opts.schema;
  el.rootEntity = opts.rootEntity;
  el.multiEntityPickerEnabled = opts.multiEntityPickerEnabled;
  el.query = emptyGroup('and');
  document.body.appendChild(el);
  await settle(el);
  await settle(el);
  return el;
}

function pickerOf(el: Element): HTMLSelectElement | null {
  return (el.shadowRoot?.querySelector('.qb-entity-picker') ?? null) as HTMLSelectElement | null;
}

describe('mp-query-builder — toolbar entity picker (M18)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does not render the toolbar when multiEntityPickerEnabled=false', async () => {
    const el = await mount({ schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: false });
    expect(el.shadowRoot?.querySelector('.qb-toolbar')).toBeNull();
    expect(pickerOf(el)).toBeNull();
  });

  it('does not render the toolbar when schema has only one entity', async () => {
    const el = await mount({ schema: SINGLE_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true });
    expect(el.shadowRoot?.querySelector('.qb-toolbar')).toBeNull();
  });

  it('renders the entity picker when enabled and schema has multiple entities', async () => {
    const el = await mount({ schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true });
    const picker = pickerOf(el);
    expect(picker).toBeTruthy();
    expect(picker!.value).toBe('orders');
    expect(Array.from(picker!.options).map((o) => o.value)).toEqual(['orders', 'customers']);
  });

  it('changing the picker emits root-entity-change with the new value', async () => {
    const el = await mount({ schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true });
    let emitted: { rootEntity: string } | null = null;
    el.addEventListener('root-entity-change', (e) => {
      emitted = (e as CustomEvent<{ rootEntity: string }>).detail;
    });
    const picker = pickerOf(el)!;
    picker.value = 'customers';
    picker.dispatchEvent(new Event('change'));
    await settle(el);
    expect(emitted).toEqual({ rootEntity: 'customers' });
    expect(el.rootEntity).toBe('customers');
  });

  it('selecting the already-selected entity is a no-op (no event)', async () => {
    const el = await mount({ schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true });
    let fired = 0;
    el.addEventListener('root-entity-change', () => { fired++; });
    const picker = pickerOf(el)!;
    picker.value = 'orders';
    picker.dispatchEvent(new Event('change'));
    await settle(el);
    expect(fired).toBe(0);
  });
});
