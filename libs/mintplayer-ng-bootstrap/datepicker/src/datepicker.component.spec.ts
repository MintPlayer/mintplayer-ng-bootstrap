import { Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDatepickerComponent } from './datepicker.component';

@Directive({
  selector: '[bsDropdown]'
})
class BsDropdownMockDirective {
  @Input() public hasBackdrop = false;
  @Input() public closeOnClickOutside = false;
}

describe('BsDatepickerComponent', () => {
  let component: BsDatepickerComponent;
  let fixture: ComponentFixture<BsDatepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsDatepickerComponent,
        
        // Mock dependencies
        BsDropdownMockDirective
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDatepickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
