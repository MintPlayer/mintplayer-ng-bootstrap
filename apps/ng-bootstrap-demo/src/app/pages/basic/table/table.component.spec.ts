import { Component, Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { TableComponent } from './table.component';

@Component({
  selector: 'bs-grid',
  template: 'grid'
})
class BsGridMockComponent {}

@Directive({
  selector: '[bsColumn]'
})
class BsGridColumnMockDirective {
  @Input() public bsColumn: string | null = '';
}

@Component({
  selector: 'bs-table',
  template: `<ng-content></ng-content>`
})
class BsTableMockComponent {
  @Input() public isResponsive = true;
}

describe('TableComponent', () => {
  let component: TableComponent;
  let fixture: ComponentFixture<TableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule
      ],
      declarations: [
        // Unit to test
        TableComponent,
      
        // Mock dependencies
        BsGridMockComponent,
        BsGridColumnMockDirective,
        BsTableMockComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
