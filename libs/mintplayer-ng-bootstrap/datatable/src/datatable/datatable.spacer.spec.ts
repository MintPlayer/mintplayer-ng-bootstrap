import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import {
  BsDatatableColumnDirective,
  BsDatatableComponent,
  BsRowTemplateDirective,
  DatatableSettings,
} from '@mintplayer/ng-bootstrap/datatable';

// === Regression tests for the trailing spacer cell ===
//
// The paginated-mode body table uses `table-layout: fixed; width: max-content;
// min-width: 100%`, so when pinned column widths sum to less than the host
// width the table grows to fill the host. Under fixed layout, leftover space
// is given to the one column that has no explicit width — that's the trailing
// `.bs-datatable-spacer` cell appended to every row. Without it, table-layout
// would redistribute the leftover proportionally across the pinned columns,
// breaking the resize-freeze semantics.
//
// These tests guard the DOM contract — that the spacer is rendered on every
// row and the footer colspan accounts for it — so a future template refactor
// that silently drops the spacer fails CI.

interface Row { id: number; name: string; year: number; }

function makeFetch(totalRecords: number) {
  return (req: PaginationRequest): Promise<PaginationResponse<Row>> => {
    const skip = (req.page - 1) * req.perPage;
    const data = Array.from(
      { length: Math.min(req.perPage, Math.max(0, totalRecords - skip)) },
      (_, i) => ({ id: skip + i, name: `Row ${skip + i}`, year: 2000 + skip + i }),
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
  selector: 'datatable-spacer-paginated-harness',
  imports: [BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective],
  template: `
    <bs-datatable
      [fetch]="fetch()"
      [selectable]="selectable()"
      [(settings)]="settings">
      <ng-template bsDatatableColumn="id">Id</ng-template>
      <ng-template bsDatatableColumn="name">Name</ng-template>
      <ng-template bsDatatableColumn="year">Year</ng-template>
      <ng-template bsRowTemplate let-row>
        <td>{{ row?.id }}</td>
        <td>{{ row?.name }}</td>
        <td>{{ row?.year }}</td>
      </ng-template>
    </bs-datatable>
  `,
})
class PaginatedHarnessComponent {
  fetch = signal(makeFetch(5));
  selectable = signal<'none' | 'single' | 'multiple'>('none');
  settings = signal(new DatatableSettings({}));
}

@Component({
  selector: 'datatable-spacer-virtual-harness',
  imports: [BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective],
  template: `
    <bs-datatable
      [virtualScroll]="true"
      [itemSize]="40"
      [fetch]="fetch()"
      [(settings)]="settings">
      <ng-template bsDatatableColumn="id">Id</ng-template>
      <ng-template bsDatatableColumn="name">Name</ng-template>
      <ng-template bsRowTemplate let-row>
        <td>{{ row?.id }}</td>
        <td>{{ row?.name }}</td>
      </ng-template>
    </bs-datatable>
  `,
})
class VirtualHarnessComponent {
  fetch = signal(makeFetch(50));
  settings = signal(new DatatableSettings({}));
}

describe('BsDatatableComponent — trailing spacer cell', () => {
  describe('paginated mode without selection', () => {
    let fixture: ComponentFixture<PaginatedHarnessComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [PaginatedHarnessComponent] }).compileComponents();
      fixture = TestBed.createComponent(PaginatedHarnessComponent);
      fixture.detectChanges();
      for (let i = 0; i < 5; i++) await Promise.resolve();
      fixture.detectChanges();
    });

    const headerCells = (): HTMLElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('bs-table thead tr th'));
    const bodyRows = (): HTMLTableRowElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('bs-table tbody tr'));
    const footerCell = (): HTMLTableCellElement =>
      fixture.nativeElement.querySelector('bs-table tfoot tr td') as HTMLTableCellElement;

    it('appends one trailing <th class="bs-datatable-spacer"> to the header row', () => {
      const cells = headerCells();
      // 3 columns + 1 spacer = 4 cells (no checkbox col, selectable = 'none')
      expect(cells.length).toBe(4);
      const last = cells[cells.length - 1];
      expect(last.classList.contains('bs-datatable-spacer')).toBe(true);
      expect(last.getAttribute('aria-hidden')).toBe('true');
    });

    it('appends one trailing <td class="bs-datatable-spacer"> to every body row', () => {
      const rows = bodyRows();
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const cells = Array.from(row.children) as HTMLElement[];
        // 3 user cells + 1 spacer = 4 cells
        expect(cells.length).toBe(4);
        const last = cells[cells.length - 1];
        expect(last.tagName).toBe('TD');
        expect(last.classList.contains('bs-datatable-spacer')).toBe(true);
        expect(last.getAttribute('aria-hidden')).toBe('true');
      }
    });

    it('sets the footer cell colspan to columns + 1 so it spans the spacer too', () => {
      const tfoot = footerCell();
      // 3 user columns + 1 spacer = colspan 4
      expect(tfoot.getAttribute('colspan')).toBe('4');
    });
  });

  describe('paginated mode with multiple selection', () => {
    let fixture: ComponentFixture<PaginatedHarnessComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [PaginatedHarnessComponent] }).compileComponents();
      fixture = TestBed.createComponent(PaginatedHarnessComponent);
      fixture.componentInstance.selectable.set('multiple');
      fixture.detectChanges();
      for (let i = 0; i < 5; i++) await Promise.resolve();
      fixture.detectChanges();
    });

    it('keeps the spacer at the tail when a leading checkbox column is present', () => {
      const headerCells = Array.from(
        fixture.nativeElement.querySelectorAll('bs-table thead tr th'),
      ) as HTMLElement[];
      // 1 checkbox + 3 columns + 1 spacer = 5 cells
      expect(headerCells.length).toBe(5);
      expect(headerCells[0].classList.contains('select-col')).toBe(true);
      expect(headerCells[headerCells.length - 1].classList.contains('bs-datatable-spacer')).toBe(true);

      const bodyRow = fixture.nativeElement.querySelector('bs-table tbody tr') as HTMLTableRowElement;
      const bodyCells = Array.from(bodyRow.children) as HTMLElement[];
      expect(bodyCells.length).toBe(5);
      expect(bodyCells[0].classList.contains('select-col')).toBe(true);
      expect(bodyCells[bodyCells.length - 1].classList.contains('bs-datatable-spacer')).toBe(true);
    });

    it('bumps the footer colspan to include both the checkbox column and the spacer', () => {
      const tfoot = fixture.nativeElement.querySelector('bs-table tfoot tr td') as HTMLTableCellElement;
      // 1 checkbox + 3 columns + 1 spacer = colspan 5
      expect(tfoot.getAttribute('colspan')).toBe('5');
    });
  });

  describe('virtual mode', () => {
    let fixture: ComponentFixture<VirtualHarnessComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [VirtualHarnessComponent] }).compileComponents();
      fixture = TestBed.createComponent(VirtualHarnessComponent);
      fixture.detectChanges();
      for (let i = 0; i < 5; i++) await Promise.resolve();
      fixture.detectChanges();
    });

    it('renders the spacer in the header table (rendered by bs-table)', () => {
      const headerCells = Array.from(
        fixture.nativeElement.querySelectorAll('bs-table thead tr th'),
      ) as HTMLElement[];
      // 2 columns + 1 spacer = 3 cells (no checkbox, selectable defaults to 'none')
      expect(headerCells.length).toBe(3);
      expect(headerCells[headerCells.length - 1].classList.contains('bs-datatable-spacer')).toBe(true);
    });

    it('renders the spacer in the cdkVirtualFor-recycled body rows', () => {
      const bodyRows = Array.from(
        fixture.nativeElement.querySelectorAll('cdk-virtual-scroll-viewport tbody tr'),
      ) as HTMLTableRowElement[];
      expect(bodyRows.length).toBeGreaterThan(0);
      for (const row of bodyRows) {
        const cells = Array.from(row.children) as HTMLElement[];
        // 2 user cells + 1 spacer = 3 cells
        expect(cells.length).toBe(3);
        expect(cells[cells.length - 1].classList.contains('bs-datatable-spacer')).toBe(true);
      }
    });
  });
});
