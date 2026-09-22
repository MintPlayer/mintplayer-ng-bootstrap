import { beforeEach, describe, expect, it } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type { DatatableColumnDef } from '../types';

const DATA = [
  { id: 1, name: 'Ada', country: 'UK' },
  { id: 2, name: 'Grace', country: 'US' },
];

function columns(overrides: Partial<DatatableColumnDef>[] = []): DatatableColumnDef[] {
  const base: DatatableColumnDef[] = [
    { name: 'id', label: 'ID' },
    { name: 'name', label: 'Name' },
    { name: 'country', label: 'Country' },
  ];
  return base.map((c, i) => ({ ...c, ...(overrides[i] ?? {}) }));
}

async function settle(el: MpDatatable) {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

async function mount(cols: DatatableColumnDef[], attrs = '', data: unknown[] = DATA) {
  document.body.innerHTML = `<mp-datatable ${attrs}></mp-datatable>`;
  const el = document.querySelector('mp-datatable') as MpDatatable;
  (el as unknown as { columns: DatatableColumnDef[] }).columns = cols;
  (el as unknown as { data: unknown[] }).data = data;
  await settle(el);
  return el;
}

const root = (el: MpDatatable) => el.renderRoot as unknown as ParentNode;
const filterRow = (el: MpDatatable) => root(el).querySelector('thead tr.filter-row');
const headerCells = (el: MpDatatable) => [...root(el).querySelectorAll('thead tr:first-child > th')];
const filterCells = (el: MpDatatable) => [...root(el).querySelectorAll('thead tr.filter-row > th')];
const bodyCells = (el: MpDatatable) => [...root(el).querySelectorAll('tbody tr[data-row-key]:first-of-type > td')];

describe('mp-datatable filter row', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is not emitted when no column is filterable', async () => {
    const el = await mount(columns());
    expect(filterRow(el)).toBeNull();
    expect(root(el).querySelectorAll('thead tr')).toHaveLength(1);
  });

  it('is emitted when at least one column opts in', async () => {
    const el = await mount(columns([{}, { filterable: true }]));
    expect(filterRow(el)).not.toBeNull();
    expect(root(el).querySelectorAll('thead tr')).toHaveLength(2);
  });

  it('gives a non-filterable column an empty cell, so the row stays aligned', async () => {
    const el = await mount(columns([{}, { filterable: true }, {}]));

    const cells = filterCells(el);
    expect(cells).toHaveLength(3);
    expect(cells[0].querySelector('button')).toBeNull();
    expect(cells[1].querySelector('button.filter-trigger')).not.toBeNull();
    expect(cells[2].querySelector('button')).toBeNull();

    // Empty, but present and addressable — it belongs to the structural grid.
    expect(cells[0].textContent?.trim()).toBe('');
    expect(cells[0].getAttribute('data-column')).toBe('id');
  });

  it('never hides an empty cell from the accessibility tree', async () => {
    const el = await mount(columns([{}, { filterable: true }]));
    // aria-hidden here would desynchronise the column count from the other two
    // rows, which is worse than an empty cell being announced.
    for (const cell of filterCells(el)) {
      expect(cell.getAttribute('aria-hidden')).toBeNull();
    }
  });

  describe('alignment by construction', () => {
    it.each([
      ['plain', '', 0],
      ['with checkboxes', 'selection-mode="multiple"', 1],
    ])('matches the header and body cell count (%s)', async (_label, attrs, gutters) => {
      const el = await mount(columns([{ filterable: true }]), attrs);

      const expected = 3 + gutters;
      expect(headerCells(el)).toHaveLength(expected);
      expect(filterCells(el)).toHaveLength(expected);
      expect(bodyCells(el)).toHaveLength(expected);
    });

    it('repeats the leading gutters in the same order as the header', async () => {
      const el = await mount(columns([{ filterable: true }]), 'selection-mode="multiple"');

      const header = headerCells(el);
      const filter = filterCells(el);
      expect(header[0].classList.contains('checkbox-cell')).toBe(true);
      expect(filter[0].classList.contains('checkbox-cell')).toBe(true);

      // Columns line up by position, not by CSS.
      const headerColumns = header.map((c) => c.getAttribute('data-column'));
      const filterColumns = filter.map((c) => c.getAttribute('data-column'));
      expect(filterColumns).toEqual(headerColumns);
    });
  });

  it('carries no width — widths belong to the first header row', async () => {
    const el = await mount(columns([{ filterable: true, width: 120 }]));

    // `table-layout: fixed` resolves columns from row 1. Restating a width here
    // would be ignored at best and fight the measure pass at worst.
    for (const cell of filterCells(el)) {
      expect(cell.style.width).toBe('');
      expect(cell.style.minWidth).toBe('');
    }
  });

  /**
   * Regression for the measure-pass selector. `measureColumnWidth` used an
   * unqualified `th[data-column="…"]`, which picked row 1 only because it comes
   * first in document order — measured true, but an accident rather than a
   * contract once a second row carries the same attribute.
   */
  it('does not let the filter cell shadow the header cell for a column', async () => {
    const el = await mount(columns([{ filterable: true }, { filterable: true }]));

    const qualified = root(el).querySelector('thead tr:first-child th[data-column="id"]');
    const filterCell = root(el).querySelector('tr.filter-row th[data-column="id"]');

    expect(qualified).not.toBeNull();
    expect(filterCell).not.toBeNull();
    expect(qualified).not.toBe(filterCell);
    expect(qualified!.closest('tr')).toBe(root(el).querySelector('thead tr:first-child'));
  });

  it('keeps sorting in the header row and out of the filter row', async () => {
    const el = await mount(columns([{ filterable: true, sortable: true }]));

    expect(root(el).querySelector('thead tr:first-child th[data-column="id"] button.header-sort')).not.toBeNull();
    // Structural rather than guarded: there is no sort button to hit.
    expect(filterRow(el)!.querySelector('button.header-sort')).toBeNull();
  });

  it('mounts the filterRenderer node only when the panel opens', async () => {
    let calls = 0;
    const node = document.createElement('div');
    node.className = 'consumer-filter';
    const el = await mount(
      columns([
        {
          filterable: true,
          filterRenderer: () => {
            calls++;
            return node;
          },
        },
      ]),
    );

    // Rendering the row must not invoke the consumer's renderer — a closed
    // panel has no contents.
    expect(calls).toBe(0);

    const trigger = root(el).querySelector<HTMLButtonElement>('tr.filter-row th[data-column="id"] .filter-trigger')!;
    trigger.click();
    await settle(el);

    expect(calls).toBeGreaterThan(0);
    expect(document.querySelector('.mp-overlay-pane .consumer-filter')).toBe(node);
  });

  it('leaves the consumer node unstamped', async () => {
    const node = document.createElement('div');
    node.className = 'consumer-filter';
    node.innerHTML = '<button class="consumer-btn">go</button>';
    const el = await mount(columns([{ filterable: true, filterRenderer: () => node }]));

    root(el).querySelector<HTMLButtonElement>('.filter-trigger')!.click();
    await settle(el);

    // Consumer DOM is not ours to brand: stamping it would let our scoped rules
    // match their content.
    expect(node.hasAttribute('data-mps')).toBe(false);
    expect(node.querySelector('.consumer-btn')!.hasAttribute('data-mps')).toBe(false);
  });
});
