import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import {
  BsDatatableColumnDirective,
  BsDatatableComponent,
  BsRowTemplateDirective,
  DatatableSettings,
} from '@mintplayer/ng-bootstrap/datatable';

interface Row {
  id: number;
  name: string;
}

function makeFetch(totalRecords: number) {
  return (req: PaginationRequest): Promise<PaginationResponse<Row>> => {
    const skip = (req.page - 1) * req.perPage;
    const data = Array.from(
      { length: Math.min(req.perPage, Math.max(0, totalRecords - skip)) },
      (_, i) => ({ id: skip + i, name: `Row ${skip + i}` }),
    );
    return Promise.resolve({
      data,
      totalRecords,
      totalPages: Math.max(1, Math.ceil(totalRecords / req.perPage)),
      page: req.page,
      perPage: req.perPage,
    });
  };
}

@Component({
  selector: 'datatable-aria-virtual-harness',
  imports: [BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective],
  template: `
    <bs-datatable
      [virtualScroll]="true"
      [itemSize]="40"
      [fetch]="fetch()"
      [(settings)]="settings">
      <ng-template bsDatatableColumn name="id">Id</ng-template>
      <ng-template bsDatatableColumn name="name">Name</ng-template>
      <ng-template bsRowTemplate let-row>
        <td>{{ row?.id }}</td>
        <td>{{ row?.name }}</td>
      </ng-template>
    </bs-datatable>
  `,
})
class VirtualHarnessComponent {
  fetch = signal(makeFetch(10000));
  settings = signal(new DatatableSettings({}));
}

describe('BsDatatableComponent — virtual mode ARIA row indexing', () => {
  let fixture: ComponentFixture<VirtualHarnessComponent>;
  let host: VirtualHarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VirtualHarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(VirtualHarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    // Let the priming fetch resolve and the resulting signal write flush.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  });

  const headerTable = (): HTMLTableElement =>
    fixture.nativeElement.querySelector('bs-table table') as HTMLTableElement;
  const bodyTable = (): HTMLTableElement =>
    fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport table') as HTMLTableElement;
  const headerRow = (): HTMLTableRowElement =>
    headerTable().querySelector('thead tr') as HTMLTableRowElement;

  it('starts with aria-rowcount = 1 (just the header) before the first page resolves', async () => {
    let resolveFetch!: (value: PaginationResponse<Row>) => void;
    host.fetch.set(() => new Promise<PaginationResponse<Row>>((resolve) => { resolveFetch = resolve; }));
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(headerTable().getAttribute('aria-rowcount')).toBe('1');
    expect(bodyTable().getAttribute('aria-rowcount')).toBe('1');

    resolveFetch({ data: [], totalRecords: 42, totalPages: 1, page: 1, perPage: 50 });
    for (let i = 0; i < 5; i++) await Promise.resolve();
    fixture.detectChanges();

    expect(headerTable().getAttribute('aria-rowcount')).toBe('43');
    expect(bodyTable().getAttribute('aria-rowcount')).toBe('43');
  });

  it('exposes aria-rowcount = totalRecords + 1 on both header and body tables once data resolves', () => {
    expect(headerTable().getAttribute('aria-rowcount')).toBe('10001');
    expect(bodyTable().getAttribute('aria-rowcount')).toBe('10001');
  });

  it('marks the header row with aria-rowindex="1"', () => {
    expect(headerRow().getAttribute('aria-rowindex')).toBe('1');
  });

  it('updates aria-rowcount when the fetch is swapped to a smaller set', async () => {
    host.fetch.set(makeFetch(7));
    fixture.detectChanges();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    fixture.detectChanges();

    expect(headerTable().getAttribute('aria-rowcount')).toBe('8');
    expect(bodyTable().getAttribute('aria-rowcount')).toBe('8');
  });
});
