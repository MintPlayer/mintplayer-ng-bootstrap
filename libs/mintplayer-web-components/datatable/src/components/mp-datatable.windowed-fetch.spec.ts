import { describe, it, expect, afterEach } from 'vitest';
import './mp-datatable';
import { MpDatatable } from './mp-datatable';
import type {
  DatatableColumnDef,
  DatatableFetch,
  DatatableFetchRequest,
  SelectionChangeEventDetail,
} from '../types';

// These tests use the web component with NO framework — just
// `document.createElement('mp-datatable')` + `el.fetch = fn`. That is exactly
// the vanilla / Rollup usage contract: one callback, nothing else.

interface Row {
  id: number;
  name: string;
  childCount?: number;
}

const columns: DatatableColumnDef<Row>[] = [
  { name: 'name', label: 'Name', cellRenderer: (r) => r.name },
];

const makeRows = (page: number, perPage: number, total: number): Row[] => {
  const start = (page - 1) * perPage;
  return Array.from({ length: Math.max(0, Math.min(perPage, total - start)) }, (_, i) => ({
    id: start + i + 1,
    name: `r${start + i + 1}`,
  }));
};

/** Flush the WC's reload microtask + async fetch, then settle the render. */
const flush = async (el: MpDatatable): Promise<void> => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
};

function placeholderCount(el: MpDatatable): number {
  return (el.renderRoot as unknown as ParentNode).querySelectorAll('tbody tr[data-placeholder="true"]').length;
}
function realRowCount(el: MpDatatable): number {
  return (el.renderRoot as unknown as ParentNode).querySelectorAll('tbody tr[data-placeholder="false"]').length;
}

/**
 * Create a fetch-driven table. `latch:false` makes the fetch resolve
 * immediately; `latch:true` returns promises you resolve manually via
 * `release()` (so placeholders can be observed before data arrives).
 */
function setup(opts: {
  total: number;
  perPage: number;
  tree?: boolean;
  latch?: boolean;
}): {
  el: MpDatatable;
  calls: DatatableFetchRequest[];
  release: () => Promise<void>;
} {
  const calls: DatatableFetchRequest[] = [];
  const pending: Array<() => void> = [];
  const fetchFn: DatatableFetch<Row> = (req) => {
    calls.push({ ...req });
    const make = () => {
      if (req.parentId == null) {
        // Roots / flat windows. In tree mode give roots a child count so
        // expansion reserves child placeholders (which triggers a child fetch).
        const rows = makeRows(req.page, req.perPage, opts.total);
        const data = opts.tree ? rows.map((r) => ({ ...r, childCount: 2 })) : rows;
        return { data, totalRecords: opts.total };
      }
      return { data: [{ id: 10000 + Number(req.parentId), name: `child-of-${String(req.parentId)}` }], totalRecords: 2 };
    };
    // Page 1 always resolves immediately (the total must be known before any
    // windowing/placeholders exist); only pages ≥ 2 latch when requested.
    return opts.latch && req.parentId == null && req.page > 1
      ? new Promise<{ data: Row[]; totalRecords: number }>((res) => pending.push(() => res(make())))
      : Promise.resolve(make());
  };

  const el = document.createElement('mp-datatable') as MpDatatable;
  el.columns = columns as DatatableColumnDef[];
  el.virtualScroll = true;
  el.perPage = opts.perPage;
  if (opts.tree) {
    el.tree = true;
    el.idKey = 'id';
    el.childCountKey = 'childCount';
  }
  el.fetch = fetchFn as DatatableFetch;
  document.body.appendChild(el);

  return {
    el,
    calls,
    release: async () => {
      pending.splice(0).forEach((r) => r());
      await flush(el);
    },
  };
}

describe('mp-datatable — fetch-callback (vanilla, no framework)', () => {
  let el: MpDatatable | undefined;
  afterEach(() => {
    el?.remove();
    el = undefined;
  });

  it('loads page 1 from `fetch` alone — no data/totalRecords wiring', async () => {
    const h = setup({ total: 50, perPage: 10 });
    el = h.el;
    await flush(el);

    // Page 1 fetched with parentId null; rows rendered.
    expect(h.calls[0]).toMatchObject({ parentId: null, page: 1, perPage: 10 });
    expect(realRowCount(el)).toBeGreaterThanOrEqual(10);
  });

  it('derives totalRecords from the response (consumer never sets it)', async () => {
    const h = setup({ total: 50, perPage: 10 });
    el = h.el;
    await flush(el);
    expect(el.totalRecords).toBe(50);
    const table = (el.renderRoot as unknown as ParentNode).querySelector('table')!;
    expect(table.getAttribute('aria-rowcount')).toBe('51'); // 50 + header
  });

  it('fetches only the viewport pages on demand, and dedups them', async () => {
    const h = setup({ total: 50, perPage: 10 });
    el = h.el;
    await flush(el);

    const pages = h.calls.filter((c) => c.parentId == null).map((c) => c.page).sort((a, b) => a - b);
    // Page 1 (initial) + page 2 (in the jsdom viewport [0,20)); pages 3-5 below the fold.
    expect(pages).toEqual([1, 2]);

    // A second scan (scroll jitter) must not re-request page 2.
    const scroll = (el.renderRoot as unknown as ParentNode).querySelector('.datatable-scroll')!;
    scroll.dispatchEvent(new Event('scroll'));
    await flush(el);
    expect(h.calls.filter((c) => c.parentId == null && c.page === 2)).toHaveLength(1);
  });

  it('renders placeholders for not-yet-resolved windows, then real rows', async () => {
    const h = setup({ total: 50, perPage: 10, latch: true });
    el = h.el;
    await flush(el);
    // Page 1 resolved (10 real rows); page 2 is in flight → its slots are
    // placeholders in the viewport [0,20).
    expect(realRowCount(el)).toBe(10);
    expect(placeholderCount(el)).toBe(10);

    await h.release();
    // Page 2 resolved → the whole visible window is real rows.
    expect(realRowCount(el)).toBe(20);
    expect(placeholderCount(el)).toBe(0);
  });

  it('reloads from page 1 under the new sort when a sort header is clicked', async () => {
    const h = setup({ total: 50, perPage: 10 });
    el = h.el;
    await flush(el);
    const before = h.calls.length;

    // Sort activation lives on a real <button> now (keyboard-operable), not on
    // the <th> itself.
    const sortButton = (el.renderRoot as unknown as ParentNode).querySelector(
      'th[data-column="name"] button.header-sort',
    ) as HTMLElement;
    sortButton.click();
    await flush(el);

    const after = h.calls.slice(before).filter((c) => c.parentId == null);
    expect(after.some((c) => c.page === 1 && c.sortColumns.length > 0)).toBe(true);
  });

  it('emits selected ROW objects, not just ids', async () => {
    const h = setup({ total: 50, perPage: 10 });
    el = h.el;
    el.selectionMode = 'multiple';
    await flush(el);

    let detail: SelectionChangeEventDetail<Row> | undefined;
    el.addEventListener('mp-datatable-selection-change', (e) => {
      detail = (e as CustomEvent<SelectionChangeEventDetail<Row>>).detail;
    });

    const firstCheckbox = (el.renderRoot as unknown as ParentNode).querySelector('tbody tr[data-placeholder="false"] mp-checkbox') as HTMLElement;
    firstCheckbox?.dispatchEvent(new CustomEvent('change', { detail: { checked: true }, bubbles: true, composed: true }));
    await flush(el);

    expect(detail).toBeDefined();
    // Index-aligned with selectedIds: selectedRows[i] is the row of selectedIds[i].
    expect(detail!.selectedIds).toHaveLength(1);
    expect(detail!.selectedRows.map((r) => (r ? String(r.id) : undefined))).toEqual(detail!.selectedIds);
    expect(detail!.selectedRows[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String) });
  });

  it('keeps selectedRows aligned when a seeded key has no row (undefined at its index)', async () => {
    const h = setup({ total: 50, perPage: 10 });
    el = h.el;
    el.selectionMode = 'multiple';
    await flush(el);
    el.selectedIds = ['999', '1'];

    let detail: SelectionChangeEventDetail<Row> | undefined;
    el.addEventListener('mp-datatable-selection-change', (e) => {
      detail = (e as CustomEvent<SelectionChangeEventDetail<Row>>).detail;
    });
    const second = (el.renderRoot as unknown as ParentNode).querySelector('tbody tr[data-row-key="2"] mp-checkbox')!;
    second.dispatchEvent(new CustomEvent('change'));
    await flush(el);

    expect(detail!.selectedIds).toEqual(['999', '1', '2']);
    expect(detail!.selectedRows.map((r) => r?.name)).toEqual([undefined, 'r1', 'r2']);
  });

  it('keeps a selected row through virtual-scroll windows: it is reported after it scrolled out', async () => {
    const h = setup({ total: 50, perPage: 10 });
    el = h.el;
    el.selectionMode = 'checkbox';
    await flush(el);
    const root = el.renderRoot as unknown as ParentNode;
    root.querySelector('tbody tr[data-row-key="1"] mp-checkbox')!.dispatchEvent(new CustomEvent('change'));
    await flush(el);

    // Scroll the window to rows ~31-40: row 1 is no longer rendered, and
    // pages 3 and 4 are fetched on demand.
    const scroller = root.querySelector<HTMLElement>('.datatable-scroll')!;
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, get: () => 30 * el!.itemSize });
    scroller.dispatchEvent(new Event('scroll'));
    await flush(el);
    await flush(el);
    expect(root.querySelector('tbody tr[data-row-key="1"]')).toBeNull();
    expect(h.calls.some((c) => c.parentId == null && c.page === 4)).toBe(true);

    let detail: SelectionChangeEventDetail<Row> | undefined;
    el.addEventListener('mp-datatable-selection-change', (e) => {
      detail = (e as CustomEvent<SelectionChangeEventDetail<Row>>).detail;
    });
    root.querySelector('tbody tr[data-row-key="35"] mp-checkbox')!.dispatchEvent(new CustomEvent('change'));
    await flush(el);

    expect(detail!.selectedIds).toEqual(['1', '35']);
    expect(detail!.selectedRows.map((r) => r?.name)).toEqual(['r1', 'r35']);
  });
});

/**
 * D9 / spike S3: a Shift range is resolved against the whole flat list, and is
 * REFUSED while any row inside it is still a placeholder. Page 2 is held back
 * by a latch; every other page answers at once.
 */
describe('mp-datatable — Shift range over unloaded windows (D9)', () => {
  let el: MpDatatable | undefined;
  afterEach(() => {
    el?.remove();
    el = undefined;
  });

  function setupHeldPage2() {
    let releasePage2: (() => void) | null = null;
    const fetchFn: DatatableFetch<Row> = (req) => {
      const resp = { data: makeRows(req.page, req.perPage, 50), totalRecords: 50 };
      return req.page === 2
        ? new Promise<typeof resp>((res) => { releasePage2 = () => res(resp); })
        : Promise.resolve(resp);
    };
    const table = document.createElement('mp-datatable') as MpDatatable;
    table.columns = columns as DatatableColumnDef[];
    table.virtualScroll = true;
    table.perPage = 10;
    table.selectionMode = 'multiple';
    table.fetch = fetchFn as DatatableFetch;
    document.body.appendChild(table);
    return { table, release: () => releasePage2?.() };
  }

  const root = (t: MpDatatable) => t.renderRoot as unknown as ParentNode;
  const rowOf = (t: MpDatatable, key: string) =>
    root(t).querySelector<HTMLElement>(`tbody tr[data-row-key="${key}"]`)!;
  const clickRow = (t: MpDatatable, key: string, init: MouseEventInit = {}) =>
    rowOf(t, key).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
  /** Scroll the virtual window so it starts at `index` (minus the buffer). */
  async function scrollTo(t: MpDatatable, index: number): Promise<void> {
    const scroller = root(t).querySelector<HTMLElement>('.datatable-scroll')!;
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, get: () => index * t.itemSize });
    scroller.dispatchEvent(new Event('scroll'));
    await flush(t);
    await flush(t);
  }

  it('refuses a range with placeholders inside it, keeps selection and anchor, and announces why', async () => {
    const h = setupHeldPage2();
    el = h.table;
    await flush(el);

    clickRow(el, '1'); // anchor
    await flush(el);
    // Rows 21-40 render and load (pages 3 and 4); page 2 (rows 11-20) is still held.
    await scrollTo(el, 30);
    expect(rowOf(el, '25').dataset['placeholder']).toBe('false');

    const events: string[][] = [];
    el.addEventListener('mp-datatable-selection-change', (e) =>
      events.push((e as CustomEvent<SelectionChangeEventDetail>).detail.selectedIds));
    clickRow(el, '25', { shiftKey: true });
    await flush(el);

    expect(events).toEqual([]);
    expect(el.selectedIds).toEqual(['1']);
    expect(root(el).querySelector('[role="status"]')?.textContent)
      .toBe('Range not selected: some rows in it have not loaded yet');
    // No placeholder key ever entered the selection.
    expect(el.selectedIds.some((k) => k.startsWith('__placeholder'))).toBe(false);

    // Once page 2 has loaded, the same Shift-click ranges from the kept anchor,
    // which is no longer rendered (it scrolled out of the window).
    h.release();
    await flush(el);
    expect(rowOf(el, '1')).toBeNull();
    clickRow(el, '25', { shiftKey: true });
    await flush(el);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(Array.from({ length: 25 }, (_, i) => String(i + 1)));
    expect(el.selectedRows.every((r) => r !== undefined)).toBe(true);
  });
});

describe('mp-datatable — fetch-callback tree mode', () => {
  let el: MpDatatable | undefined;
  afterEach(() => {
    el?.remove();
    el = undefined;
  });

  it('fetches roots (parentId null) and children (parentId set) through one callback', async () => {
    const h = setup({ total: 50, perPage: 10, tree: true });
    el = h.el;
    // Give roots a child count so expansion triggers a child fetch.
    await flush(el);
    el.data; // (roots are owned by the WC; nothing to assert directly here)

    // Roots were fetched with parentId null.
    expect(h.calls.some((c) => c.parentId === null && c.page === 1)).toBe(true);

    // Expand the first root → its child placeholders enter the viewport → a
    // child fetch with that parentId.
    el.expandedIds = new Set([1]);
    await flush(el);
    await flush(el);
    expect(h.calls.some((c) => c.parentId === 1)).toBe(true);
  });
});
