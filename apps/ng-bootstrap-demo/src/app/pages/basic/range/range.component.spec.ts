import { Component, Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RangeComponent } from './range.component';

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

@Component({
  selector: 'bs-range',
  template: `<input type="range">`
})
class BsRangeMockComponent { }

describe('RangeComponent', () => {
  let component: RangeComponent;
  let fixture: ComponentFixture<RangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        RangeComponent,
      
        // Mock dependencies
        BsGridMockComponent,
        BsColumnMockDirective,
        BsRangeMockComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
