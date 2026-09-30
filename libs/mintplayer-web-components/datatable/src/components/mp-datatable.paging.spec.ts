import { afterEach, describe, expect, it } from 'vitest';
import { html } from 'lit';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type { DatatableColumnDef, DatatableFetch, DatatableFetchRequest } from '../types';

/**
 * The pagination footer (rows-per-page and page pickers), and the row
 * renderer's fallback contract.
 */
interface Row { id: number; name: string; }

const ROWS: Row[] = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: `r${i + 1}` }));

const settle = async (el: MpDatatable): Promise<void> => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
};

const root = (el: MpDatatable) => el.renderRoot as unknown as ParentNode;
const bodyKeys = (el: MpDatatable) =>
  Array.from(root(el).querySelectorAll<HTMLElement>('tbody tr[data-row-key]')).map((r) => r.dataset['rowKey']);
const pick = (el: MpDatatable, which: 'per-page' | 'pagination', page: number) =>
  root(el).querySelector(`.datatable-${which}`)!.dispatchEvent(
    new CustomEvent('mp-pagination-page-change', { detail: { page } }),
  );

async function mountPaged(): Promise<MpDatatable> {
  const el = document.createElement('mp-datatable') as MpDatatable;
  el.setAttribute('pagination', '');
  el.columns = [{ name: 'name', label: 'Name' }] as DatatableColumnDef[];
  el.data = ROWS;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

function record(el: MpDatatable, type: string): unknown[] {
  const out: unknown[] = [];
  el.addEventListener(type, (e) => out.push((e as CustomEvent).detail));
  return out;
}

describe('mp-datatable rows-per-page', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('choosing a per-page size re-slices, returns to page 1 and emits both events', async () => {
    const el = await mountPaged();
    pick(el, 'pagination', 2);
    await settle(el);
    expect(bodyKeys(el)[0]).toBe('21');

    const perPage = record(el, 'mp-datatable-per-page-change');
    const page = record(el, 'mp-datatable-page-change');
    pick(el, 'per-page', 10);
    await settle(el);

    expect(perPage).toEqual([{ perPage: 10 }]);
    expect(page).toEqual([{ page: 1 }]);
    expect(el.perPage).toBe(10);
    expect(el.page).toBe(1);
    expect(bodyKeys(el)).toEqual(ROWS.slice(0, 10).map((r) => String(r.id)));
  });

  it('re-choosing the current size is a no-op — no events, no page reset', async () => {
    const el = await mountPaged();
    pick(el, 'pagination', 2);
    await settle(el);
    const perPage = record(el, 'mp-datatable-per-page-change');
    pick(el, 'per-page', 20);
    await settle(el);
    expect(perPage).toEqual([]);
    expect(el.page).toBe(2);
  });

  it('offers the configured sizes, and falls back to the defaults for an empty list', async () => {
    const el = await mountPaged();
    el.perPageOptions = [5, 15];
    await settle(el);
    const picker = root(el).querySelector('.datatable-per-page') as unknown as { pageNumbers: number[] };
    expect(picker.pageNumbers).toEqual([5, 15]);

    el.perPageOptions = [];
    await settle(el);
    expect(el.perPageOptions).toEqual([10, 20, 50]);
  });

  it('a fetch-driven table reloads page 1 at the new size', async () => {
    const calls: DatatableFetchRequest[] = [];
    const fetchFn: DatatableFetch<Row> = async (req) => {
      calls.push(req);
      const start = (req.page - 1) * req.perPage;
      return { data: ROWS.slice(start, start + req.perPage), totalRecords: ROWS.length };
    };
    const el = document.createElement('mp-datatable') as MpDatatable;
    el.setAttribute('pagination', '');
    el.columns = [{ name: 'name', label: 'Name' }] as DatatableColumnDef[];
    el.fetch = fetchFn as DatatableFetch;
    document.body.appendChild(el);
    await settle(el);

    pick(el, 'per-page', 50);
    await settle(el);
    expect(calls.at(-1)).toMatchObject({ page: 1, perPage: 50, parentId: null });
    expect(bodyKeys(el)).toHaveLength(45);
  });
});

describe('mp-datatable page picker', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('clamps a requested page into range before emitting it', async () => {
    const el = await mountPaged();
    const pages = record(el, 'mp-datatable-page-change');
    pick(el, 'pagination', 99);
    await settle(el);
    pick(el, 'pagination', -3);
    await settle(el);
    expect(pages).toEqual([{ page: 3 }, { page: 1 }]);
  });
});

describe('mp-datatable rowRenderer', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  async function mountWith(renderer: MpDatatable['rowRenderer']): Promise<MpDatatable> {
    const el = document.createElement('mp-datatable') as MpDatatable;
    el.columns = [{ name: 'name', label: 'Name' }] as DatatableColumnDef[];
    el.data = ROWS.slice(0, 2);
    el.rowRenderer = renderer;
    document.body.appendChild(el);
    await settle(el);
    return el;
  }

  const cells = (el: MpDatatable) =>
    Array.from(root(el).querySelectorAll('tbody tr[data-row-key]')).map((tr) => tr.textContent?.trim());

  it('returning null falls back to the per-column cells', async () => {
    const el = await mountWith(() => null);
    expect(cells(el)).toEqual(['r1', 'r2']);
  });

  it('an array of nodes is mounted as the row content, in order', async () => {
    const el = await mountWith((row) => {
      const a = document.createElement('td');
      a.textContent = `${(row as Row).id}`;
      const b = document.createElement('td');
      b.textContent = (row as Row).name.toUpperCase();
      return [a, b];
    });
    expect(cells(el)).toEqual(['1R1', '2R2']);
  });

  it('a single node is mounted as-is', async () => {
    const el = await mountWith((row) => {
      const td = document.createElement('td');
      td.className = 'custom';
      td.textContent = (row as Row).name;
      return td;
    });
    expect(root(el).querySelectorAll('tbody td.custom')).toHaveLength(2);
  });

  it('cell renderers may return a lit template or nothing at all', async () => {
    const el = document.createElement('mp-datatable') as MpDatatable;
    el.columns = [
      { name: 'name', label: 'Name', cellRenderer: (r) => html`<b>${(r as Row).name}</b>` },
      { name: 'hidden', label: 'Hidden', cellRenderer: () => false },
      { name: 'missing', label: 'Missing' },
    ] as DatatableColumnDef[];
    el.data = [{ id: 1, name: 'x' }];
    document.body.appendChild(el);
    await settle(el);
    const tds = Array.from(root(el).querySelectorAll('tbody td'));
    expect(tds[0].querySelector('b')?.textContent).toBe('x');
    expect(tds[1].textContent?.trim()).toBe('');
    expect(tds[2].textContent?.trim()).toBe('');
  });
});
