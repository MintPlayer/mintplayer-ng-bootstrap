import { Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { BsTimepickerComponent } from './timepicker.component';

@Directive({
  selector: '[bsDropdown]'
})
class BsDropdownMockDirective {
  @Input() public isOpen = false;
  @Input() public hasBackdrop = false;
  @Input() public closeOnClickOutside = false;
  @Input() public sameDropdownWidth = false;
}

describe('BsTimepickerComponent', () => {
  let component: BsTimepickerComponent;
  let fixture: ComponentFixture<BsTimepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormsModule ],
      declarations: [
        // Unit to test
        BsTimepickerComponent,

        // Mock dependencies
        BsDropdownMockDirective
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTimepickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
