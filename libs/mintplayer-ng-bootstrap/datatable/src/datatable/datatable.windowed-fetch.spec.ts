import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DatatableColumnDef, MpDatatable } from '@mintplayer/web-components/datatable';
import type { PaginationResponse } from '@mintplayer/pagination';

import { BsDatatableComponent } from './datatable.component';
import { BsDatatableFetchRequest } from '../datatable-fetch';
import { DatatableSettings } from '../datatable-settings';

interface Row {
  id: number;
  name: string;
}

function makePage(page: number, perPage: number): Row[] {
  return Array.from({ length: perPage }, (_, i) => {
    const id = (page - 1) * perPage + i + 1;
    return { id, name: `p${page}-${i}` };
  });
}

/**
 * `[virtualBuffer]="0"` collapses the WC's virtual viewport to an empty range in
 * jsdom (no layout → clientHeight 0), so the WC emits no spontaneous
 * viewport-driven fetch-requests. That isolates the WRAPPER's behaviour: page-1
 * fetch on init, and the explicit fetch-request bridge we dispatch by hand.
 */
@Component({
  selector: 'dt-fetch-harness',
  imports: [BsDatatableComponent],
  template: `<bs-datatable
    [columns]="columns()"
    [fetch]="fetch"
    [virtualScroll]="true"
    [virtualBuffer]="0"
    [settings]="settings()"
  ></bs-datatable>`,
})
class FetchHarness {
  readonly columns = signal<DatatableColumnDef<Row>[]>([
    { name: 'name', label: 'Name', cellRenderer: (r) => r.name },
  ]);
  readonly settings = signal<DatatableSettings>(
    new DatatableSettings({ perPage: { values: [10, 20, 50], selected: 10 } }),
  );

  readonly fetchCalls: BsDatatableFetchRequest[] = [];
  /** Overridable per-test; defaults to a faithful 1000-row server over 100 pages of 10. */
  responder: (req: BsDatatableFetchRequest) => PaginationResponse<Row> = (req) => ({
    data: makePage(req.page, 10),
    totalRecords: 1000,
    page: req.page,
    perPage: 10,
    totalPages: 100,
  });

  readonly fetch = (req: BsDatatableFetchRequest): Promise<PaginationResponse<Row>> => {
    this.fetchCalls.push(req);
    return Promise.resolve(this.responder(req));
  };
}

const flush = async (fixture: ComponentFixture<unknown>): Promise<void> => {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
  await fixture.whenStable();
};

describe('BsDatatableComponent — flat virtual windowed fetch (wrapper)', () => {
  let fixture: ComponentFixture<FetchHarness>;
  let harness: FetchHarness;

  const mpEl = (): MpDatatable =>
    fixture.nativeElement.querySelector('mp-datatable') as MpDatatable;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FetchHarness] }).compileComponents();
    fixture = TestBed.createComponent(FetchHarness);
    harness = fixture.componentInstance;
    fixture.detectChanges();
    await flush(fixture);
  });

  it('fetches only page 1 on init — no eager full drain', () => {
    // The old runVirtualFetchAll would loop every page up front; the windowed
    // path fetches just page 1 and lets the WC pull the rest on scroll.
    expect(harness.fetchCalls.length).toBe(1);
    expect(harness.fetchCalls[0].page).toBe(1);
    expect(harness.fetchCalls[0].perPage).toBe(10);
  });

  it('bridges a flat-window fetch-request (parentId:null) to [fetch] and back to setFetchResponse', async () => {
    const el = mpEl();
    const setSpy = vi.spyOn(el, 'setFetchResponse');
    harness.fetchCalls.length = 0;

    el.dispatchEvent(
      new CustomEvent('mp-datatable-fetch-request', {
        detail: { parentId: null, page: 3, perPage: 10, sortColumns: [] },
        bubbles: true,
        composed: true,
      }),
    );
    await flush(fixture);

    // Wrapper resolved the consumer's [fetch] for the requested page…
    expect(harness.fetchCalls.map((r) => r.page)).toEqual([3]);
    // …and handed the result back to the WC, keyed by parentId null.
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy.mock.calls[0][0]).toBeNull();
  });

  it('keys setFetchResponse on the REQUESTED page, not the server-echoed page', async () => {
    const el = mpEl();
    const setSpy = vi.spyOn(el, 'setFetchResponse');
    harness.fetchCalls.length = 0;
    // Simulate a server that normalises/echoes a different page number.
    harness.responder = (req) => ({
      data: makePage(req.page, 10),
      totalRecords: 1000,
      page: 99, // ← deliberately wrong
      perPage: 10,
      totalPages: 100,
    });

    el.dispatchEvent(
      new CustomEvent('mp-datatable-fetch-request', {
        detail: { parentId: null, page: 4, perPage: 10, sortColumns: [] },
        bubbles: true,
        composed: true,
      }),
    );
    await flush(fixture);

    // The page handed to the WC must be the requested 4 — otherwise the
    // placeholder for page 4 never clears and the page stays pending forever.
    const response = setSpy.mock.calls[0][1] as { page: number };
    expect(response.page).toBe(4);
  });

  it('invalidates the windowed cache on sort change before refetching page 1', async () => {
    const el = mpEl();
    const invSpy = vi.spyOn(el, 'invalidateData');
    harness.fetchCalls.length = 0;

    // New sort → wrapper drops the stale window and refetches page 1.
    harness.settings.set(
      new DatatableSettings({
        perPage: { values: [10, 20, 50], selected: 10 },
        sortColumns: [{ property: 'name', direction: 'ascending' }],
      }),
    );
    fixture.detectChanges();
    await flush(fixture);

    expect(invSpy).toHaveBeenCalled();
    expect(harness.fetchCalls.map((r) => r.page)).toContain(1);
    expect(harness.fetchCalls[harness.fetchCalls.length - 1].sortColumns).toEqual([
      { property: 'name', direction: 'ascending' },
    ]);
  });
});
