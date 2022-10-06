import { Component, Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForDirectiveComponent } from './for-directive.component';

@Directive({
  selector: '[bsFor]'
})
class BsForDirective {

  @Input() bsFor: any;

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

describe('ForDirectiveComponent', () => {
  let component: ForDirectiveComponent;
  let fixture: ComponentFixture<ForDirectiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        ForDirectiveComponent,
        
        // Mock dependencies
        BsForDirective,
        BsGridMockComponent,
        BsColumnMockDirective
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ForDirectiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
