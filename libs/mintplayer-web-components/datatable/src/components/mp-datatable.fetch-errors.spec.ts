import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type {
  DatatableColumnDef,
  DatatableDistincts,
  DatatableFetch,
  DatatableFetchRequest,
} from '../types';

/**
 * Failure and staleness paths of the WC-owned async sources: the `fetch`
 * callback (page, window and children loads) and the `distincts` source of
 * the filter panel. A failure must never leave a request marked in flight —
 * that would block every retry for the element's lifetime.
 */
interface Row { id: number; name: string; childCount?: number; }

const settle = async (el: MpDatatable): Promise<void> => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
};
const root = (el: MpDatatable) => el.renderRoot as unknown as ParentNode;
const realKeys = (el: MpDatatable) =>
  Array.from(root(el).querySelectorAll<HTMLElement>('tbody tr[data-placeholder="false"]'))
    .map((r) => r.dataset['rowKey']);

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  consoleError.mockRestore();
  document.body.innerHTML = '';
});

function mount(fetchFn: DatatableFetch<Row>, opts: { tree?: boolean; virtual?: boolean } = {}): MpDatatable {
  const el = document.createElement('mp-datatable') as MpDatatable;
  el.columns = [{ name: 'name', label: 'Name' }] as DatatableColumnDef[];
  if (opts.tree) {
    el.tree = true;
    el.idKey = 'id';
    el.childCountKey = 'childCount';
  }
  if (opts.virtual) {
    el.virtualScroll = true;
    el.perPage = 10;
  }
  el.fetch = fetchFn as DatatableFetch;
  document.body.appendChild(el);
  return el;
}

describe('mp-datatable fetch failures', () => {
  it('a failed page load is logged and leaves the table empty rather than throwing', async () => {
    const el = mount(async () => { throw new Error('boom'); });
    await settle(el);
    expect(realKeys(el)).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith('[mp-datatable] fetch failed for page', 1, expect.any(Error));
  });

  it('a failed child load can be retried by expanding again', async () => {
    const calls: DatatableFetchRequest[] = [];
    let failChildren = true;
    const el = mount(async (req) => {
      calls.push(req);
      if (req.parentId == null) return { data: [{ id: 1, name: 'p', childCount: 1 }], totalRecords: 1 };
      if (failChildren) throw new Error('children down');
      return { data: [{ id: 2, name: 'c' }], totalRecords: 1 };
    }, { tree: true });
    await settle(el);

    const chevron = () => root(el).querySelector<HTMLButtonElement>('button.tree-chevron')!;
    chevron().click();
    await settle(el);
    expect(consoleError).toHaveBeenCalledWith('[mp-datatable] fetch failed for children of', 1, expect.any(Error));

    failChildren = false;
    chevron().click(); // collapse
    await settle(el);
    chevron().click(); // expand → retried, not blocked by a stale in-flight mark
    await settle(el);
    expect(calls.filter((c) => c.parentId === 1)).toHaveLength(2);
    expect(realKeys(el)).toEqual(['1', '2']);
  });

  it('a failed window page is logged and re-requested on the next scan', async () => {
    const calls: DatatableFetchRequest[] = [];
    let failWindow = true;
    const el = mount(async (req) => {
      calls.push(req);
      if (req.page > 1 && failWindow) throw new Error('window down');
      const start = (req.page - 1) * req.perPage;
      return {
        data: Array.from({ length: req.perPage }, (_, i) => ({ id: start + i + 1, name: `r${start + i + 1}` })),
        totalRecords: 50,
      };
    }, { virtual: true });
    await settle(el);
    await settle(el);
    expect(consoleError).toHaveBeenCalledWith('[mp-datatable] fetch failed for root page', 2, expect.any(Error));

    failWindow = false;
    root(el).querySelector('.datatable-scroll')!.dispatchEvent(new Event('scroll'));
    await settle(el);
    await settle(el);
    expect(calls.filter((c) => c.page === 2).length).toBeGreaterThanOrEqual(2);
    expect(realKeys(el)).toContain('11');
  });

  it('a response that lands after the callback was cleared is dropped', async () => {
    const release: Array<() => void> = [];
    const el = mount((req) => new Promise((res) => release.push(() =>
      res({ data: [{ id: req.page, name: 'late' }], totalRecords: 1 })))) ;
    await settle(el);
    el.fetch = null;
    release.splice(0).map((r) => r());
    await settle(el);
    expect(realKeys(el)).toEqual([]);
    expect(el.totalRecords).toBeNull();
  });
});

describe('mp-datatable distincts failures', () => {
  const columns: DatatableColumnDef[] = [{ name: 'country', label: 'Country', filterable: true }];

  async function openPanel(distincts: DatatableDistincts): Promise<MpDatatable> {
    const el = document.createElement('mp-datatable') as MpDatatable;
    el.columns = columns;
    el.data = [{ id: 1, country: 'UK' }];
    el.distincts = distincts;
    document.body.appendChild(el);
    await settle(el);
    root(el).querySelector<HTMLButtonElement>('tr.filter-row th[data-column="country"] .filter-trigger')!.click();
    await settle(el);
    return el;
  }

  it('a rejected source ends loading and shows the empty-list notice instead of a spinner', async () => {
    await openPanel(async () => { throw new Error('distincts down'); });
    expect(document.querySelector('.mp-overlay-pane .filter-loading')).toBeNull();
    expect(document.querySelector('.mp-overlay-pane .filter-no-values')).not.toBeNull();
    expect(document.querySelectorAll('.mp-overlay-pane .filter-option')).toHaveLength(0);
  });

  it('shows the loading state while the source is pending', async () => {
    await openPanel(() => new Promise(() => undefined));
    expect(document.querySelector('.mp-overlay-pane .filter-loading')).not.toBeNull();
    expect(document.querySelector('.mp-overlay-pane .filter-no-values')).toBeNull();
  });
});
