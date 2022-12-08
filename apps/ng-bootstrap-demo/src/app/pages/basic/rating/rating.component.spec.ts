import { Component, Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RatingComponent } from './rating.component';

@Component({
  selector: 'bs-rating'
})
class BsRatingMockComponent {
  @Input() maximum = 5;
  @Input() value = 0;
}

@Component({
  selector: 'bs-grid',
  template: 'grid'
})
class BsGridMockComponent { }

@Directive({
  selector: '[bsColumn]'
})
class BsGridColumnMockDirective {
  @Input() public bsColumn: string | null = '';
}

describe('RatingComponent', () => {
  let component: RatingComponent;
  let fixture: ComponentFixture<RatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        RatingComponent,
      
        // Mock dependencies
        BsRatingMockComponent,
        BsGridMockComponent,
        BsGridColumnMockDirective
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
