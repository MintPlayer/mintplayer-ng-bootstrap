import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DatatableColumnDef, MpDatatable } from '@mintplayer/web-components/datatable';
import type { PaginationResponse } from '@mintplayer/pagination';

import { BsDatatableComponent } from './datatable.component';
import { BsDatatableFetch, BsDatatableFetchRequest } from '../datatable-fetch';
import { DatatableSettings } from '../datatable-settings';

interface Row {
  id: number;
  name: string;
}

@Component({
  selector: 'dt-fetch-harness',
  imports: [BsDatatableComponent],
  template: `<bs-datatable
    [columns]="columns()"
    [fetch]="fetch"
    [virtualScroll]="true"
    [(selection)]="selection"
  ></bs-datatable>`,
})
class FetchHarness {
  readonly columns = signal<DatatableColumnDef<Row>[]>([
    { name: 'name', label: 'Name', cellRenderer: (r) => r.name },
  ]);
  readonly selection = signal<Row[]>([]);
  readonly fetchCalls: BsDatatableFetchRequest[] = [];

  readonly fetch: BsDatatableFetch<Row> = (req: BsDatatableFetchRequest) => {
    this.fetchCalls.push(req);
    const perPage = req.perPage || 10;
    const data = Array.from({ length: perPage }, (_, i) => ({ id: (req.page - 1) * perPage + i + 1, name: `r${i}` }));
    return Promise.resolve(<PaginationResponse<Row>>{ data, totalRecords: 1000, page: req.page, perPage });
  };
}

const flush = async (fixture: ComponentFixture<unknown>): Promise<void> => {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
  await fixture.whenStable();
};

describe('BsDatatableComponent — fetch forwarder (wrapper)', () => {
  let fixture: ComponentFixture<FetchHarness>;
  let harness: FetchHarness;
  const mpEl = (): MpDatatable => fixture.nativeElement.querySelector('mp-datatable') as MpDatatable;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FetchHarness] }).compileComponents();
    fixture = TestBed.createComponent(FetchHarness);
    harness = fixture.componentInstance;
    fixture.detectChanges();
    await flush(fixture);
  });

  it('forwards [fetch] to the WC, which drives the initial page-1 load itself', () => {
    // The wrapper no longer runs a fetch loop — it just assigns el.fetch and the
    // WC calls it. Page 1 with parentId null proves the forward + WC ownership.
    expect(typeof mpEl().fetch).toBe('function');
    expect(harness.fetchCalls.some((c) => c.parentId == null && c.page === 1)).toBe(true);
  });

  it('merges the WC selection-change event into the [(selection)] model by key', async () => {
    // The host owns a row the element reports back without a row object
    // (`undefined` at its index, e.g. a key whose page is not loaded): the
    // model keeps that row rather than dropping it.
    const earlier: Row = { id: 503, name: 'from page 51' };
    harness.selection.set([earlier]);
    await flush(fixture);
    const seven: Row = { id: 7, name: 'seven' };
    mpEl().dispatchEvent(
      new CustomEvent('mp-datatable-selection-change', {
        detail: { selectedIds: ['503', '7'], selectedRows: [undefined, seven] },
        bubbles: true,
        composed: true,
      }),
    );
    await flush(fixture);
    const model = harness.selection();
    expect(model).toHaveLength(2);
    expect(model[0]).toBe(earlier);
    expect(model[1]).toBe(seven);
  });
});

@Component({
  selector: 'dt-paged-fetch-harness',
  imports: [BsDatatableComponent],
  template: `<bs-datatable
    [columns]="columns()"
    [fetch]="fetchFn()"
    [(settings)]="settings"
    [selectionMode]="'multiple'"
    [(selection)]="selection"
  ></bs-datatable>`,
})
class PagedFetchHarness {
  readonly columns = signal<DatatableColumnDef<Row>[]>([
    { name: 'name', label: 'Name', cellRenderer: (r) => r.name },
  ]);
  readonly selection = signal<Row[]>([]);
  readonly settings = signal(new DatatableSettings({
    perPage: { values: [10], selected: 10 },
    page: { values: [1], selected: 1 },
  }));
  readonly calls: BsDatatableFetchRequest[] = [];

  /** A new callback identity each call, like an inline closure or a factory. */
  makeFetch(): BsDatatableFetch<Row> {
    return (req: BsDatatableFetchRequest) => {
      this.calls.push(req);
      const data = Array.from({ length: req.perPage }, (_, i) => {
        const id = (req.page - 1) * req.perPage + i + 1;
        return { id, name: `r${id}` };
      });
      return Promise.resolve(<PaginationResponse<Row>>{ data, totalRecords: 100, page: req.page, perPage: req.perPage });
    };
  }
  readonly fetchFn = signal<BsDatatableFetch<Row>>(this.makeFetch());
}

/** #407 through the wrapper: one effect, one `applyFetchState`, one request per change. */
describe('BsDatatableComponent — fetch state and paging selection (wrapper, #407/#422)', () => {
  let fixture: ComponentFixture<PagedFetchHarness>;
  let host: PagedFetchHarness;
  const mpEl = (): MpDatatable => fixture.nativeElement.querySelector('mp-datatable') as MpDatatable;
  const component = (): BsDatatableComponent<Row> =>
    fixture.debugElement.query(By.directive(BsDatatableComponent)).componentInstance;
  const withPage = (page: number) => {
    const s = host.settings();
    return new DatatableSettings({ ...s, page: { ...s.page, selected: page } });
  };
  const clickRow = async (key: string, init: MouseEventInit = {}) => {
    mpEl().querySelector<HTMLTableRowElement>(`tbody tr[data-row-key="${key}"]`)!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
    await flush(fixture);
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(PagedFetchHarness);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await flush(fixture);
    await flush(fixture);
  });

  it('loads page 1 exactly once', () => {
    expect(host.calls.map((c) => c.page)).toEqual([1]);
  });

  it("the issue's cross-tick repro (settings, await, new fetch) costs exactly one request", async () => {
    host.calls.length = 0;
    host.settings.set(withPage(2));
    await Promise.resolve();
    host.fetchFn.set(host.makeFetch());
    await flush(fixture);
    await flush(fixture);
    expect(host.calls.map((c) => c.page)).toEqual([2]);
  });

  it('settings and a new fetch landing in two change-detection passes of one tick cost one request', async () => {
    host.calls.length = 0;
    host.settings.set(withPage(3));
    fixture.detectChanges();
    host.fetchFn.set(host.makeFetch());
    fixture.detectChanges();
    await flush(fixture);
    await flush(fixture);
    expect(host.calls.map((c) => c.page)).toEqual([3]);
  });

  it('re-running the forwarding effect with the same fetch and equal settings requests nothing', async () => {
    host.calls.length = 0;
    host.settings.set(new DatatableSettings({ ...host.settings() }));
    await flush(fixture);
    await flush(fixture);
    expect(host.calls).toEqual([]);
  });

  it('reload() forwards to the element: one request for the current page; resetPage returns to page 1', async () => {
    host.settings.set(withPage(4));
    await flush(fixture);
    await flush(fixture);
    host.calls.length = 0;
    component().reload();
    await flush(fixture);
    await flush(fixture);
    expect(host.calls.map((c) => c.page)).toEqual([4]);

    host.calls.length = 0;
    component().reload({ resetPage: true });
    await flush(fixture);
    await flush(fixture);
    expect(host.calls.map((c) => c.page)).toEqual([1]);
    expect(host.settings().page.selected).toBe(1);
  });

  it('a selection survives a page change and a reload, keeping the earlier row object', async () => {
    await clickRow('3');
    const [three] = host.selection();
    expect(three).toEqual({ id: 3, name: 'r3' });

    host.settings.set(withPage(2));
    await flush(fixture);
    await flush(fixture);
    expect(mpEl().querySelector('tbody tr[data-row-key="3"]')).toBeNull();
    await clickRow('12', { ctrlKey: true });

    const model = host.selection();
    expect(model).toHaveLength(2);
    expect(model[0]).toBe(three);
    expect(model[1]).toEqual({ id: 12, name: 'r12' });

    host.calls.length = 0;
    component().reload();
    await flush(fixture);
    await flush(fixture);
    expect(host.calls).toHaveLength(1);
    expect(mpEl().selectedIds).toEqual(['3', '12']);
    expect(host.selection()).toBe(model);
  });
});
