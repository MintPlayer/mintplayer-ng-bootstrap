import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDatatableColumnDirective } from './datatable-column.directive';

describe('BsDatatableColumnDirective', () => {
  let component: BsDatatableColumnTestComponent;
  let fixture: ComponentFixture<BsDatatableColumnTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsDatatableColumnDirective,

        // Mock components
        BsDatatableMockComponent,

        // Testbench
        BsDatatableColumnTestComponent,
      ],
      providers: []
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDatatableColumnTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-datatable-column-test',
  template: `
    <bs-datatable>
      <div *bsDatatableColumn="{ sortable: true, name: 'Name' }">
        1. Artist
      </div>
      <div *bsDatatableColumn="{ sortable: true, name: 'YearStarted' }">
        2. Year started
      </div>
      <div *bsDatatableColumn="{ sortable: true, name: 'YearQuit' }">
        3. Year quit
      </div>
    </bs-datatable>`
})
class BsDatatableColumnTestComponent {
}

@Component({
  selector: 'bs-datatable',
  template: `
    <div class="table-responsive overflow-y-hidden mb-3">
      <table class="table table-striped table-hover w-100 mb-0" cellspacing="0" role="grid">
        <thead>
          <tr>
            <th *ngFor="let column of columns" class="text-nowrap"
                [class.sort]="column.bsDatatableColumn.sortable"
                [class.sort-asc]="column.bsDatatableColumn.sortable && (settings.sortProperty == column.bsDatatableColumn.name) && (settings.sortDirection == 'ascending')"
                [class.sort-desc]="column.bsDatatableColumn.sortable && (settings.sortProperty == column.bsDatatableColumn.name) && (settings.sortDirection == 'descending')"
                (click)="columnHeaderClicked(column)">
                <ng-container *ngTemplateOutlet="column.templateRef"></ng-container>
            </th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      </table>
    </div>`
})
class BsDatatableMockComponent {
}
