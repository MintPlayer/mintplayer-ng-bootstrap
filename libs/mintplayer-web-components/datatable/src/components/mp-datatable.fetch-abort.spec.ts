import { afterEach, describe, expect, it } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type { DatatableColumnDef, DatatableFetch, DatatableFetchRequest } from '../types';

/**
 * #436 D4: a superseded `fetch` request is aborted through `request.signal`,
 * not merely ignored on arrival. Before this, a slow page request kept running
 * after a sort change and its response was dropped by the generation guard —
 * correct, but wasteful, and a consumer could not cancel the HTTP call.
 */
interface Row { id: number; name: string; }

const columns: DatatableColumnDef[] = [{ name: 'name', label: 'Name' }];

const settle = async (el: MpDatatable): Promise<void> => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
};

describe('mp-datatable fetch abort', () => {
  let el: MpDatatable;
  afterEach(() => el?.remove());

  it('aborts the in-flight request when the pages are invalidated, and ignores its AbortError', async () => {
    const requests: DatatableFetchRequest[] = [];
    const pending: ((rows: Row[]) => void)[] = [];
    const fetchFn: DatatableFetch<Row> = (req) => {
      requests.push(req);
      return new Promise((resolve, reject) => {
        req.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        pending.push((rows) => resolve({ data: rows, totalRecords: rows.length }));
      });
    };
    el = document.createElement('mp-datatable') as MpDatatable;
    el.setAttribute('pagination', '');
    el.perPage = 10;
    el.columns = columns;
    el.fetch = fetchFn as DatatableFetch;
    document.body.appendChild(el);
    await settle(el);
    expect(requests).toHaveLength(1);
    expect(requests[0].signal.aborted).toBe(false);

    el.reload();
    await settle(el);
    expect(requests).toHaveLength(2);
    expect(requests[0].signal.aborted).toBe(true);
    expect(requests[1].signal.aborted).toBe(false);

    pending[1]([{ id: 1, name: 'fresh' }]);
    await settle(el);
    expect(el.data.map((r) => (r as Row).name)).toEqual(['fresh']);
  });
});
