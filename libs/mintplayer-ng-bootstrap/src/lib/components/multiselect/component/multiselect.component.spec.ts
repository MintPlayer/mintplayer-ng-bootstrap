import { Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsMultiselectComponent } from './multiselect.component';

@Directive({
  selector: '[bsDropdown]'
})
class BsDropdownMockDirective {
  @Input() public hasBackdrop = false;
  @Input() public closeOnClickOutside = false;
}

describe('BsMultiselectComponent', () => {
  let component: BsMultiselectComponent;
  let fixture: ComponentFixture<BsMultiselectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsMultiselectComponent,
      
        // Mock dependencies
        BsDropdownMockDirective
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsMultiselectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
