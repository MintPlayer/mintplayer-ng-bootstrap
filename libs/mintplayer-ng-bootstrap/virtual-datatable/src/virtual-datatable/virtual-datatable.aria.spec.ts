import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDatatableColumnDirective, DatatableSettings } from '@mintplayer/ng-bootstrap/datatable';

import { BsVirtualDatatableComponent } from './virtual-datatable.component';
import { VirtualDatatableDataSource } from '../virtual-datatable-data-source';
import { BsVirtualRowTemplateDirective } from '../virtual-row-template/virtual-row-template.directive';

interface Row {
  id: number;
  name: string;
}

/**
 * Build a fixture that always reports `totalRecords` regardless of the page
 * being fetched, so we can assert aria-rowcount even though jsdom doesn't
 * actually render any virtual rows. The tests below focus on the ARIA
 * surface contract, NOT on what cdkVirtualFor materialises.
 */
function makeDataSource(totalRecords: number): VirtualDatatableDataSource<Row> {
  return new VirtualDatatableDataSource<Row>(
    async (skip, take) => ({
      data: Array.from({ length: Math.min(take, Math.max(0, totalRecords - skip)) }, (_, i) => ({
        id: skip + i,
        name: `Row ${skip + i}`,
      })),
      totalRecords,
    }),
    50,
  );
}

@Component({
  selector: 'virtual-datatable-aria-harness',
  imports: [BsVirtualDatatableComponent, BsDatatableColumnDirective, BsVirtualRowTemplateDirective],
  template: `
    <bs-virtual-datatable [dataSource]="dataSource()" [(settings)]="settings" [itemSize]="40">
      <ng-template bsDatatableColumn name="id">Id</ng-template>
      <ng-template bsDatatableColumn name="name">Name</ng-template>
      <ng-template bsVirtualRowTemplate let-row>
        <td>{{ row?.id }}</td>
        <td>{{ row?.name }}</td>
      </ng-template>
    </bs-virtual-datatable>
  `,
})
class HarnessComponent {
  dataSource = signal(makeDataSource(10000));
  settings = signal(new DatatableSettings({}));
}

describe('BsVirtualDatatableComponent — ARIA row indexing', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HarnessComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    // Allow the BehaviorSubject->signal effect to flush after first fetchPages.
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
    // Re-create with a fresh data source where we can hold the fetch open.
    let resolveFetch!: (value: { data: Row[]; totalRecords: number }) => void;
    const pendingDs = new VirtualDatatableDataSource<Row>(
      () => new Promise((resolve) => { resolveFetch = resolve; }),
      50,
    );
    host.dataSource.set(pendingDs);
    fixture.detectChanges();

    expect(headerTable().getAttribute('aria-rowcount')).toBe('1');
    expect(bodyTable().getAttribute('aria-rowcount')).toBe('1');

    resolveFetch({ data: [], totalRecords: 42 });
    // fetchPages chain: await fetchFn → next(totalRecords) → BehaviorSubject
    // notifies the component's effect → signal set → view marked dirty.
    // Need a couple of microtask flushes for the promise chain inside
    // fetchPages, then a CD pass to re-evaluate the binding.
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
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

  it('updates aria-rowcount when the data source is swapped to a smaller set', async () => {
    host.dataSource.set(makeDataSource(7));
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(headerTable().getAttribute('aria-rowcount')).toBe('8');
    expect(bodyTable().getAttribute('aria-rowcount')).toBe('8');
  });
});
