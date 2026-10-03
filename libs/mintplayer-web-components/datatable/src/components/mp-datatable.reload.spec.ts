import { afterEach, describe, expect, it } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type { DatatableColumnDef, DatatableFetch, DatatableFetchRequest } from '../types';

/**
 * #407 (D11): every way of driving a `fetch` table costs exactly the requests
 * it should. Same-identity `fetch` and structurally equal `sortColumns` are
 * no-ops, `applyFetchState` applies several fields as one request, and
 * `reload()` forces one request without touching the selection.
 */
interface Row { id: number; name: string; }

const ALL: Row[] = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `r${i + 1}` }));
const columns: DatatableColumnDef[] = [{ name: 'name', label: 'Name' }];

const settle = async (el: MpDatatable): Promise<void> => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
};

function makeFetch(calls: DatatableFetchRequest[]): DatatableFetch {
  const fn: DatatableFetch<Row> = async (req) => {
    calls.push({ ...req });
    const start = (req.page - 1) * req.perPage;
    return { data: ALL.slice(start, start + req.perPage).map((r) => ({ ...r })), totalRecords: ALL.length };
  };
  return fn as DatatableFetch;
}

async function mount(fetchFn?: DatatableFetch): Promise<{ el: MpDatatable; calls: DatatableFetchRequest[]; fetchFn: DatatableFetch }> {
  const calls: DatatableFetchRequest[] = [];
  const fn = fetchFn ?? makeFetch(calls);
  const el = document.createElement('mp-datatable') as MpDatatable;
  el.setAttribute('pagination', '');
  el.selectionMode = 'checkbox';
  el.perPage = 10;
  el.columns = columns;
  el.fetch = fn;
  document.body.appendChild(el);
  await settle(el);
  return { el, calls, fetchFn: fn };
}

function record(el: MpDatatable, type: string): unknown[] {
  const out: unknown[] = [];
  el.addEventListener(type, (e) => out.push((e as CustomEvent).detail));
  return out;
}

describe('mp-datatable fetch identity (#407)', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('assigning the same fetch twice costs one request', async () => {
    const calls: DatatableFetchRequest[] = [];
    const fn = makeFetch(calls);
    const el = document.createElement('mp-datatable') as MpDatatable;
    el.columns = columns;
    el.fetch = fn;
    el.fetch = fn;
    document.body.appendChild(el);
    await settle(el);
    expect(calls).toHaveLength(1);

    // A framework re-binding the unchanged callback after the load is a no-op too.
    el.fetch = fn;
    await settle(el);
    expect(calls).toHaveLength(1);
  });

  it('a different callback is a new source and loads once', async () => {
    const { el, calls } = await mount();
    const next: DatatableFetchRequest[] = [];
    el.fetch = makeFetch(next);
    await settle(el);
    expect(calls).toHaveLength(1);
    expect(next).toHaveLength(1);
  });
});

describe('mp-datatable sortColumns equality (#407)', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('a structurally equal sortColumns costs no request; a changed one costs one', async () => {
    const { el, calls } = await mount();
    el.sortColumns = [{ property: 'name', direction: 'ascending' }];
    await settle(el);
    expect(calls).toHaveLength(2);

    // A new array with the same content: an echo, not a sort change.
    el.sortColumns = [{ property: 'name', direction: 'ascending' }];
    await settle(el);
    expect(calls).toHaveLength(2);

    el.sortColumns = [{ property: 'name', direction: 'descending' }];
    await settle(el);
    expect(calls).toHaveLength(3);
    expect(calls[2].sortColumns).toEqual([{ property: 'name', direction: 'descending' }]);
  });
});

describe('mp-datatable applyFetchState (#407)', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('applies fetch, sortColumns, page and perPage as ONE request', async () => {
    const { el, calls } = await mount();
    const next: DatatableFetchRequest[] = [];
    const pageChanges = record(el, 'mp-datatable-page-change');

    el.applyFetchState({
      fetch: makeFetch(next),
      sortColumns: [{ property: 'name', direction: 'descending' }],
      page: 3,
      perPage: 5,
    });
    await settle(el);

    expect(calls).toHaveLength(1); // the old callback is never asked again
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      parentId: null,
      page: 3,
      perPage: 5,
      sortColumns: [{ property: 'name', direction: 'descending' }],
    });
    expect(el.page).toBe(3);
    expect(el.perPage).toBe(5);
    // Host-driven state is not echoed back as a user page change.
    expect(pageChanges).toEqual([]);
  });

  it('costs nothing when every field is unchanged', async () => {
    const { el, calls, fetchFn } = await mount();
    el.applyFetchState({
      fetch: fetchFn,
      sortColumns: [...el.sortColumns],
      page: el.page,
      perPage: el.perPage,
    });
    await settle(el);
    expect(calls).toHaveLength(1);
  });

  it('a perPage change without a page returns to page 1, in one request', async () => {
    const { el, calls } = await mount();
    el.page = 2;
    await settle(el);
    expect(calls).toHaveLength(2);

    el.applyFetchState({ perPage: 5 });
    await settle(el);
    expect(calls).toHaveLength(3);
    expect(calls[2]).toMatchObject({ page: 1, perPage: 5 });
  });

  it('{ fetch: null } removes the callback and requests nothing', async () => {
    const { el, calls } = await mount();
    el.applyFetchState({ fetch: null });
    await settle(el);
    expect(el.fetch).toBeNull();
    expect(calls).toHaveLength(1);
  });
});

describe('mp-datatable reload() (#407)', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  const toggle = (el: MpDatatable, key: string) =>
    (el.renderRoot as unknown as ParentNode)
      .querySelector(`tbody tr[data-row-key="${key}"] mp-checkbox`)!
      .dispatchEvent(new CustomEvent('change'));

  it('re-queries the current state once and keeps the selection', async () => {
    const { el, calls } = await mount();
    el.page = 2;
    await settle(el);
    toggle(el, '11');
    await settle(el);
    el.selectedIds = ['11', '3'];
    const selectionEvents = record(el, 'mp-datatable-selection-change');
    const before = calls.length;

    el.reload();
    await settle(el);
    expect(calls).toHaveLength(before + 1);
    expect(calls.at(-1)).toMatchObject({ page: 2, perPage: 10 });
    expect(el.selectedIds).toEqual(['11', '3']);
    expect((el.selectedRows[0] as Row).name).toBe('r11');
    expect(selectionEvents).toEqual([]);
  });

  it('coalesces several reloads in one task into one request', async () => {
    const { el, calls } = await mount();
    el.reload();
    el.reload();
    el.sortColumns = [{ property: 'name', direction: 'ascending' }];
    await settle(el);
    expect(calls).toHaveLength(2);
  });

  it('resetPage returns to page 1 and reports the page change', async () => {
    const { el, calls } = await mount();
    el.page = 3;
    await settle(el);
    const pageChanges = record(el, 'mp-datatable-page-change');
    const before = calls.length;

    el.reload({ resetPage: true });
    await settle(el);
    expect(el.page).toBe(1);
    expect(calls).toHaveLength(before + 1);
    expect(calls.at(-1)).toMatchObject({ page: 1 });
    expect(pageChanges).toEqual([{ page: 1 }]);

    // Already on page 1: still one request, but no page change to report.
    el.reload({ resetPage: true });
    await settle(el);
    expect(calls).toHaveLength(before + 2);
    expect(pageChanges).toEqual([{ page: 1 }]);
  });

  it('is a harmless no-op without a fetch callback', async () => {
    const el = document.createElement('mp-datatable') as MpDatatable;
    el.columns = columns;
    el.data = ALL.slice(0, 3);
    document.body.appendChild(el);
    await settle(el);
    expect(() => el.reload()).not.toThrow();
    await settle(el);
    expect(el.data).toHaveLength(3);
  });
});
