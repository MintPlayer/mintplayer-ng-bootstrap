import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

@Component({
  selector: 'bs-pagination',
  template: `
    <ul>
      <ng-content></ng-content>
    </ul>`
})
class BsPaginationMockComponent {
  @Input() showArrows = true;
  @Input() numberOfBoxes: number | null = null;
  @Input() pageNumbers: number[] = [10];
  @Input() selectedPageNumber = 10;
  @Output() selectedPageNumberChange = new EventEmitter<number>();
}

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        PaginationComponent,
        
        // Mock dependencies
        BsPaginationMockComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
