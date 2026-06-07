import { describe, it, expect, afterEach } from 'vitest';
import './mp-datatable';
import { MpDatatable } from './mp-datatable';
import type { DatatableColumnDef } from '../types';

interface Row {
  id: number;
  name: string;
}

const columns: DatatableColumnDef<Row>[] = [
  { name: 'name', label: 'Name', cellRenderer: (r) => r.name },
];

function makePage(page: number, perPage: number): Row[] {
  // 1-based page; ids are globally unique so rowKey (default `id`) is stable.
  return Array.from({ length: perPage }, (_, i) => {
    const id = (page - 1) * perPage + i + 1;
    return { id, name: `p${page}-${i}` };
  });
}

/**
 * Build a flat virtual + external-paging datatable: page 1 seeded into `data`,
 * `totalRecords` larger than one page so `isFlatWindowed()` is true. jsdom does
 * no layout (`clientHeight === 0`), so `refreshVirtualRange` lands a viewport of
 * `[0, virtualBuffer * 2)` on first render — with `perPage` of 10 and a buffer
 * of 10 that covers pages 1 and 2, which is exactly what these tests exercise.
 */
async function makeWindowed(opts: {
  totalRecords: number;
  perPage: number;
  page1?: Row[];
  onRequest?: (detail: { parentId: unknown; page: number; perPage: number }) => void;
}): Promise<MpDatatable> {
  const el = document.createElement('mp-datatable') as MpDatatable;
  el.columns = columns as DatatableColumnDef[];
  el.virtualScroll = true;
  el.perPage = opts.perPage;
  el.autoSort = false; // fetch mode: server owns ordering
  el.data = (opts.page1 ?? makePage(1, opts.perPage)) as unknown[];
  el.totalRecords = opts.totalRecords;
  if (opts.onRequest) {
    el.addEventListener('mp-datatable-fetch-request', (ev) => {
      opts.onRequest!((ev as CustomEvent).detail);
    });
  }
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function placeholderCount(el: MpDatatable): number {
  return el.shadowRoot!.querySelectorAll('tbody tr[data-placeholder="true"]').length;
}

function realRowCount(el: MpDatatable): number {
  return el.shadowRoot!.querySelectorAll('tbody tr[data-placeholder="false"]').length;
}

describe('mp-datatable — flat virtual windowed fetch', () => {
  let el: MpDatatable | undefined;
  afterEach(() => {
    el?.remove();
    el = undefined;
  });

  it('renders placeholders for unloaded pages and sizes aria-rowcount from totalRecords', async () => {
    el = await makeWindowed({ totalRecords: 50, perPage: 10 });

    // Viewport is [0, 20): page 1 (indices 0-9, in `data`) is real, page 2
    // (indices 10-19, not yet fetched) is placeholders.
    expect(realRowCount(el)).toBe(10);
    expect(placeholderCount(el)).toBe(10);

    // Scrollbar/structure sized from the full total, not the 10 loaded rows.
    const table = el.shadowRoot!.querySelector('table')!;
    expect(table.getAttribute('aria-rowcount')).toBe('51'); // 50 + header
  });

  it('requests exactly the viewport pages on demand and dedups in-flight pages', async () => {
    const requested: number[] = [];
    el = await makeWindowed({
      totalRecords: 50,
      perPage: 10,
      onRequest: (d) => requested.push(d.page),
    });

    // Page 2 is the only unloaded page in the viewport — page 1 is in `data`,
    // pages 3-5 are below the fold and must NOT be fetched.
    expect(requested).toEqual([2]);

    // A second scan (scroll jitter; scrollTop stays 0 in jsdom) must not
    // re-request page 2 — it's already in `_pendingPageFetches`.
    const scroll = el.shadowRoot!.querySelector('.datatable-scroll')!;
    scroll.dispatchEvent(new Event('scroll'));
    await el.updateComplete;
    expect(requested).toEqual([2]);
  });

  it('carries parentId:null + the requested page/perPage on the fetch-request', async () => {
    let detail: { parentId: unknown; page: number; perPage: number } | undefined;
    el = await makeWindowed({ totalRecords: 50, perPage: 10, onRequest: (d) => (detail = d) });
    expect(detail).toBeDefined();
    expect(detail!.parentId).toBeNull();
    expect(detail!.page).toBe(2);
    expect(detail!.perPage).toBe(10);
  });

  it('setFetchResponse(null, …) fills a page and clears its placeholders', async () => {
    el = await makeWindowed({ totalRecords: 50, perPage: 10 });
    expect(placeholderCount(el)).toBe(10);

    el.setFetchResponse(null, {
      data: makePage(2, 10) as unknown[],
      totalRecords: 50,
      page: 2,
      perPage: 10,
    });
    await el.updateComplete;

    // Page 2 is now loaded — the whole visible window [0,20) is real rows.
    expect(placeholderCount(el)).toBe(0);
    expect(realRowCount(el)).toBe(20);
  });

  it('keys the page cache on response.page, ignoring page 1 (page 1 lives in data)', async () => {
    el = await makeWindowed({ totalRecords: 50, perPage: 10 });

    // A stray page-1 response is a no-op: page 1 is owned by the `data` setter.
    el.setFetchResponse(null, {
      data: [{ id: 999, name: 'bogus' }] as unknown[],
      totalRecords: 50,
      page: 1,
      perPage: 10,
    });
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain('bogus');
  });

  it('invalidateData() clears the page cache so placeholders reappear', async () => {
    el = await makeWindowed({ totalRecords: 50, perPage: 10 });
    el.setFetchResponse(null, {
      data: makePage(2, 10) as unknown[],
      totalRecords: 50,
      page: 2,
      perPage: 10,
    });
    await el.updateComplete;
    expect(placeholderCount(el)).toBe(0);

    el.invalidateData();
    await el.updateComplete;
    expect(placeholderCount(el)).toBe(10); // page 2 reverted to placeholders
  });

  it('re-fetches the visible window after invalidateData without needing a scroll', async () => {
    // Parity with the old VirtualDatatableDataSource.reset(): invalidation must
    // re-request the currently-visible pages on the next render (driven by
    // updated() → refreshVirtualRange), not wait for the next scroll event.
    const requested: number[] = [];
    el = await makeWindowed({
      totalRecords: 50,
      perPage: 10,
      onRequest: (d) => requested.push(d.page),
    });
    el.setFetchResponse(null, {
      data: makePage(2, 10) as unknown[],
      totalRecords: 50,
      page: 2,
      perPage: 10,
    });
    await el.updateComplete;
    expect(requested).toEqual([2]); // initial request only

    el.invalidateData();
    await el.updateComplete;
    // Page 2 is visible and no longer cached/pending → requested again.
    expect(requested).toEqual([2, 2]);
  });

  it('does not window a single-page list (totalRecords ≤ data.length)', async () => {
    const onlyPage = makePage(1, 5);
    const requested: number[] = [];
    el = await makeWindowed({
      totalRecords: 5,
      perPage: 10,
      page1: onlyPage,
      onRequest: (d) => requested.push(d.page),
    });

    // Not externally paged → trivial flat mapping, no placeholders, no fetches.
    expect(placeholderCount(el)).toBe(0);
    expect(realRowCount(el)).toBe(5);
    expect(requested).toEqual([]);
  });
});
