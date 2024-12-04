import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsDatatableComponent } from '../datatable/datatable.component';
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
        MockComponent(BsDatatableComponent),

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
  standalone: false,
  template: `
    <bs-datatable>
      <div *bsDatatableColumn="'Name'; sortable: true">
        1. Artist
      </div>
      <div *bsDatatableColumn="'YearStarted'; sortable: true">
        2. Year started
      </div>
      <div *bsDatatableColumn="'YearQuit'; sortable: true">
        3. Year quit
      </div>
    </bs-datatable>`
})
class BsDatatableColumnTestComponent {
}
