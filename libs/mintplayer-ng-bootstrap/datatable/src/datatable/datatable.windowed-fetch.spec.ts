import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DatatableColumnDef, MpDatatable } from '@mintplayer/web-components/datatable';
import type { PaginationResponse } from '@mintplayer/pagination';

import { BsDatatableComponent } from './datatable.component';
import { BsDatatableFetch, BsDatatableFetchRequest } from '../datatable-fetch';

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

  it('maps the WC selection-change event onto the [(selection)] model via selectedRows', async () => {
    const rows: Row[] = [{ id: 7, name: 'seven' }];
    mpEl().dispatchEvent(
      new CustomEvent('mp-datatable-selection-change', {
        detail: { selectedIds: ['7'], selectedRows: rows },
        bubbles: true,
        composed: true,
      }),
    );
    await flush(fixture);
    expect(harness.selection()).toEqual(rows);
  });
});
