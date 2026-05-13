import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { MockComponent, MockDirective } from 'ng-mocks';

import { BsDatatableComponent } from './datatable.component';

interface Row { id: number; name: string; }

@Component({
  selector: 'datatable-create-harness',
  imports: [BsDatatableComponent],
  template: `<bs-datatable [fetch]="fetch()"></bs-datatable>`,
})
class HarnessComponent {
  fetch = signal((_req: PaginationRequest): Promise<PaginationResponse<Row>> =>
    Promise.resolve({ data: [], totalRecords: 0, totalPages: 1, page: 1, perPage: 20 }));
}

describe('BsDatatableComponent', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(BsTableComponent),
        MockComponent(BsPaginationComponent),
        HarnessComponent,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HarnessComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('bs-datatable')).toBeTruthy();
  });
});
