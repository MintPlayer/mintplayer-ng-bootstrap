import { Component, Directive, Input } from '@angular/core';
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
        BsPaginationMockComponent,
        BsTableMockComponent,
        BsGridMockComponent,
        BsColumnMockDirective
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
class BsPaginationMockComponent {

  @Input() selectedPageNumber = 0;
  @Input() numberOfBoxes = 0;
  @Input() pageNumbers: number[] = [];
  @Input() showArrows = true;

}

@Component({
  selector: 'bs-table',
  template: `
    <div>
      <table>
        <ng-content></ng-content>
      </table>
    </div>`
})
class BsTableMockComponent {
  @Input() isResponsive = false;
  @Input() striped = false;
  @Input() hover = false;
}

@Component({
  selector: 'bs-grid',
  template: `
    <div>
      <ng-content></ng-content>
    </div>`
})
class BsGridMockComponent {
  @Input() stopFullWidthAt: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'never' = 'sm';
}

@Directive({
  selector: '[bsColumn]'
})
class BsColumnMockDirective {
  @Input() bsColumn?: object | '';
}