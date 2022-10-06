import { Component, Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimepickerComponent } from './timepicker.component';

@Component({
  selector: 'bs-timepicker',
  template: `<span>Time picker</span>`
})
class BsTimepickerMockComponent {
  @Input() selectedTime = new Date();
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

describe('TimepickerComponent', () => {
  let component: TimepickerComponent;
  let fixture: ComponentFixture<TimepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test  
        TimepickerComponent,
      
        // Mock dependencies
        BsTimepickerMockComponent,
        BsGridMockComponent,
        BsColumnMockDirective
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimepickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
