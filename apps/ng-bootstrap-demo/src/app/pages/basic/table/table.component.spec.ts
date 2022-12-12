import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsGridTestingModule } from '@mintplayer/ng-bootstrap/testing';

import { TableComponent } from './table.component';

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
        FormsModule,
        BsGridTestingModule,
      ],
      declarations: [
        // Unit to test
        TableComponent,
      
        // Mock dependencies
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
