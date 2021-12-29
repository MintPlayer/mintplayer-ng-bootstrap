import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDatatableComponent } from './datatable.component';

describe('BsDatatableComponent', () => {
  let component: BsDatatableComponent;
  let fixture: ComponentFixture<BsDatatableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsDatatableComponent,
        
        // Mock dependencies
        BsPaginationComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDatatableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-pagination',
  template: `
    <ul>
      <li *ngFor="let pageNumber of (shownPageNumbers$ | async)">
        <a class="page-link">{{ pageNumber.page }}</a>
      </li>
    </ul>`
})
export class BsPaginationComponent {

  @Input() selectedPageNumber = 0;
  @Input() numberOfBoxes = 0;
  @Input() pageNumbers: number[] = [];
  @Input() showArrows = true;

}
