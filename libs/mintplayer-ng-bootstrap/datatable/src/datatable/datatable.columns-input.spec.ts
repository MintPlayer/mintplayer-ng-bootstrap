import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { MockComponent, MockDirective } from 'ng-mocks';

import { BsDatatableComponent } from './datatable.component';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
import { BsRowTemplateDirective } from '../row-template/row-template.directive';
import type { ColumnDef } from '../datatable-column/column-def';

interface Row { id: number; name: string; year: number; }

const ROWS: Row[] = [
  { id: 1, name: 'Alpha', year: 2001 },
  { id: 2, name: 'Bravo', year: 2002 },
];

const FETCH = (_req: PaginationRequest): Promise<PaginationResponse<Row>> =>
  Promise.resolve({ data: ROWS, totalRecords: 2, totalPages: 1, page: 1, perPage: 20 });

@Component({
  selector: 'harness-templates',
  imports: [BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective],
  template: `
    <bs-datatable [fetch]="fetch" [resizableColumns]="false">
      <ng-template bsDatatableColumn="id">Identifier</ng-template>
      <ng-template bsDatatableColumn="name">Name</ng-template>
      <tr *bsRowTemplate="let row">
        <td>{{ row.id }}</td>
        <td>{{ row.name }}</td>
      </tr>
    </bs-datatable>
  `,
})
class TemplateHarness {
  fetch = FETCH;
}

@Component({
  selector: 'harness-input',
  imports: [BsDatatableComponent, BsRowTemplateDirective],
  template: `
    <bs-datatable [fetch]="fetch" [columns]="cols()" [resizableColumns]="false">
      <tr *bsRowTemplate="let row">
        <td>{{ row.id }}</td>
        <td>{{ row.name }}</td>
        <td>{{ row.year }}</td>
      </tr>
    </bs-datatable>
  `,
})
class InputHarness {
  fetch = FETCH;
  cols = signal<ColumnDef[]>([
    { name: 'id', label: 'Identifier', sortable: false },
    { name: 'name', label: 'Name' },
    { name: 'year', label: 'Year started' },
  ]);
}

describe('BsDatatableComponent — [columns] input vs. content-children', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsTableComponent),
      MockComponent(BsPaginationComponent),
    ],
  }).compileComponents());

  it('renders template-defined columns when no [columns] input is provided (existing behavior)', async () => {
    const fixture: ComponentFixture<TemplateHarness> = TestBed.createComponent(TemplateHarness);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const ths = fixture.nativeElement.querySelectorAll('th');
    const labels = Array.from(ths).map((th) => (th as HTMLElement).textContent?.trim()).filter(Boolean);
    expect(labels).toContain('Identifier');
    expect(labels).toContain('Name');
  });

  it('renders programmatic columns from [columns] input', async () => {
    const fixture: ComponentFixture<InputHarness> = TestBed.createComponent(InputHarness);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const ths = fixture.nativeElement.querySelectorAll('th');
    const labels = Array.from(ths).map((th) => (th as HTMLElement).textContent?.trim()).filter(Boolean);
    expect(labels).toContain('Identifier');
    expect(labels).toContain('Name');
    expect(labels).toContain('Year started');
  });

  it('honors the sortable flag on programmatic columns', async () => {
    const fixture: ComponentFixture<InputHarness> = TestBed.createComponent(InputHarness);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const ths = Array.from(fixture.nativeElement.querySelectorAll('th')) as HTMLElement[];
    const idTh = ths.find((th) => th.textContent?.includes('Identifier'));
    const nameTh = ths.find((th) => th.textContent?.includes('Name'));
    expect(idTh?.classList.contains('sort')).toBe(false);
    expect(nameTh?.classList.contains('sort')).toBe(true);
  });

  it('reflects updated [columns] input after schema change', async () => {
    const fixture: ComponentFixture<InputHarness> = TestBed.createComponent(InputHarness);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.cols.set([
      { name: 'country', label: 'Country' },
      { name: 'email', label: 'Email' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const ths = Array.from(fixture.nativeElement.querySelectorAll('th')) as HTMLElement[];
    const labels = ths.map((th) => th.textContent?.trim()).filter(Boolean);
    expect(labels).toContain('Country');
    expect(labels).toContain('Email');
    expect(labels).not.toContain('Identifier');
    expect(labels).not.toContain('Year started');
  });
});
