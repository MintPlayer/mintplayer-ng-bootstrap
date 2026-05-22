import { describe, it, expect, beforeEach } from 'vitest';
import './mp-query-builder.element';
import type { MpQueryBuilderElement } from './mp-query-builder.element';
import type { EntitySchema } from './model/field-def';
import type { SortDescriptor } from './model/sort';
import { emptyGroup } from './model/default-tree';
const MULTI_SCHEMA: EntitySchema[] = [
  {
    name: 'orders', label: 'Orders', fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'string' },
      { name: 'lineItems', label: 'Line items', type: 'relation', targetEntity: 'lineItems' },
    ],
  },
  { name: 'customers', label: 'Customers', fields: [{ name: 'name', label: 'Name', type: 'string' }] },
  { name: 'lineItems', label: 'Line items', fields: [{ name: 'amount', label: 'Amount', type: 'number' }] },
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

async function mount(opts: {
  schema: EntitySchema[];
  rootEntity: string;
  multiEntityPickerEnabled: boolean;
  selectedFields?: string[];
  sortBy?: SortDescriptor[];
}): Promise<MpQueryBuilderElement> {
  const el = document.createElement('mp-query-builder') as MpQueryBuilderElement;
  el.schema = opts.schema;
  el.rootEntity = opts.rootEntity;
  el.multiEntityPickerEnabled = opts.multiEntityPickerEnabled;
  if (opts.selectedFields !== undefined) el.selectedFields = opts.selectedFields;
  if (opts.sortBy !== undefined) el.sortBy = opts.sortBy;
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
    expect(Array.from(picker!.options).map((o) => o.value)).toEqual(['orders', 'customers', 'lineItems']);
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

describe('mp-query-builder — toolbar field projection (M19)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function checkboxesOf(el: Element): HTMLInputElement[] {
    return Array.from(el.shadowRoot?.querySelectorAll('.qb-field-checkbox input[type="checkbox"]') ?? []) as HTMLInputElement[];
  }

  it('renders one checkbox per non-relation field of the current entity', async () => {
    // orders has total (number), status (string), lineItems (relation). Relations are skipped.
    const el = await mount({ schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true });
    const boxes = checkboxesOf(el);
    expect(boxes.map((b) => b.value)).toEqual(['total', 'status']);
  });

  it('reflects the current selectedFields state on initial render', async () => {
    const el = await mount({
      schema: MULTI_SCHEMA,
      rootEntity: 'orders',
      multiEntityPickerEnabled: true,
      selectedFields: ['status'],
    });
    const boxes = checkboxesOf(el);
    expect(boxes.find((b) => b.value === 'total')?.checked).toBe(false);
    expect(boxes.find((b) => b.value === 'status')?.checked).toBe(true);
  });

  it('toggling a checkbox dispatches selected-fields-change with the new array', async () => {
    const el = await mount({
      schema: MULTI_SCHEMA,
      rootEntity: 'orders',
      multiEntityPickerEnabled: true,
      selectedFields: [],
    });
    let emitted: { selectedFields: string[] } | null = null;
    el.addEventListener('selected-fields-change', (e) => {
      emitted = (e as CustomEvent<{ selectedFields: string[] }>).detail;
    });
    const totalCb = checkboxesOf(el).find((b) => b.value === 'total')!;
    totalCb.checked = true;
    totalCb.dispatchEvent(new Event('change'));
    await settle(el);
    expect(emitted).toEqual({ selectedFields: ['total'] });
    expect(el.selectedFields).toEqual(['total']);
  });

  it('unchecking a previously-selected field removes it from the array', async () => {
    const el = await mount({
      schema: MULTI_SCHEMA,
      rootEntity: 'orders',
      multiEntityPickerEnabled: true,
      selectedFields: ['total', 'status'],
    });
    let emitted: { selectedFields: string[] } | null = null;
    el.addEventListener('selected-fields-change', (e) => {
      emitted = (e as CustomEvent<{ selectedFields: string[] }>).detail;
    });
    const totalCb = checkboxesOf(el).find((b) => b.value === 'total')!;
    totalCb.checked = false;
    totalCb.dispatchEvent(new Event('change'));
    await settle(el);
    expect(emitted!.selectedFields).toContain('status');
    expect(emitted!.selectedFields).not.toContain('total');
  });

  it('switching entity changes the checkbox list (stale field names dropped from UI)', async () => {
    const el = await mount({
      schema: MULTI_SCHEMA,
      rootEntity: 'orders',
      multiEntityPickerEnabled: true,
      selectedFields: ['status'],
    });
    el.rootEntity = 'customers';
    await settle(el);
    await settle(el);
    const boxes = checkboxesOf(el);
    // Customers has only `name` — `status` no longer appears as a checkbox.
    expect(boxes.map((b) => b.value)).toEqual(['name']);
  });
});

describe('mp-query-builder — toolbar sort-by (M20)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function rowsOf(el: Element): Element[] {
    return Array.from(el.shadowRoot?.querySelectorAll('.qb-sort-row') ?? []);
  }
  function addBtnOf(el: Element): HTMLButtonElement {
    return el.shadowRoot?.querySelector('.qb-sort-add') as HTMLButtonElement;
  }

  it('renders no sort rows by default, just the add button', async () => {
    const el = await mount({ schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true });
    expect(rowsOf(el)).toHaveLength(0);
    expect(addBtnOf(el)).toBeTruthy();
  });

  it('clicking "+ Add sort" emits sort-by-change with the first projectable field', async () => {
    const el = await mount({ schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true });
    let emitted: { sortBy: SortDescriptor[] } | null = null;
    el.addEventListener('sort-by-change', (e) => {
      emitted = (e as CustomEvent<{ sortBy: SortDescriptor[] }>).detail;
    });
    addBtnOf(el).click();
    await settle(el);
    expect(emitted).toEqual({ sortBy: [{ field: 'total', direction: 'asc' }] });
  });

  it('renders one row per descriptor; field + direction selects show the bound values', async () => {
    const el = await mount({
      schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true,
      sortBy: [{ field: 'total', direction: 'desc' }, { field: 'status', direction: 'asc' }],
    });
    const rows = rowsOf(el);
    expect(rows).toHaveLength(2);
    const fieldSel0 = rows[0]!.querySelector('.qb-sort-field') as HTMLSelectElement;
    const dirSel0 = rows[0]!.querySelector('.qb-sort-direction') as HTMLSelectElement;
    expect(fieldSel0.value).toBe('total');
    expect(dirSel0.value).toBe('desc');
    const fieldSel1 = rows[1]!.querySelector('.qb-sort-field') as HTMLSelectElement;
    expect(fieldSel1.value).toBe('status');
  });

  it('changing direction on a row emits sort-by-change with that row updated', async () => {
    const el = await mount({
      schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true,
      sortBy: [{ field: 'total', direction: 'asc' }],
    });
    let emitted: { sortBy: SortDescriptor[] } | null = null;
    el.addEventListener('sort-by-change', (e) => {
      emitted = (e as CustomEvent<{ sortBy: SortDescriptor[] }>).detail;
    });
    const dirSel = el.shadowRoot!.querySelector('.qb-sort-direction') as HTMLSelectElement;
    dirSel.value = 'desc';
    dirSel.dispatchEvent(new Event('change'));
    await settle(el);
    expect(emitted).toEqual({ sortBy: [{ field: 'total', direction: 'desc' }] });
  });

  it('clicking remove (×) drops the row from the array', async () => {
    const el = await mount({
      schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true,
      sortBy: [{ field: 'total', direction: 'asc' }, { field: 'status', direction: 'desc' }],
    });
    let emitted: { sortBy: SortDescriptor[] } | null = null;
    el.addEventListener('sort-by-change', (e) => {
      emitted = (e as CustomEvent<{ sortBy: SortDescriptor[] }>).detail;
    });
    const removeBtns = el.shadowRoot!.querySelectorAll('.qb-sort-remove') as NodeListOf<HTMLButtonElement>;
    removeBtns[0]!.click();
    await settle(el);
    expect(emitted).toEqual({ sortBy: [{ field: 'status', direction: 'desc' }] });
  });

  it('"+ Add sort" prefers an unused field over a duplicate', async () => {
    const el = await mount({
      schema: MULTI_SCHEMA, rootEntity: 'orders', multiEntityPickerEnabled: true,
      sortBy: [{ field: 'total', direction: 'asc' }],
    });
    let emitted: { sortBy: SortDescriptor[] } | null = null;
    el.addEventListener('sort-by-change', (e) => {
      emitted = (e as CustomEvent<{ sortBy: SortDescriptor[] }>).detail;
    });
    addBtnOf(el).click();
    await settle(el);
    expect(emitted!.sortBy.map((s) => s.field)).toEqual(['total', 'status']);
  });
});
