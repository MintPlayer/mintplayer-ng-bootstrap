import { Component, ContentChild, Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
import { BehaviorSubject } from 'rxjs';
import { BsDropdownToggleDirective } from './dropdown-toggle.directive';

@Component({
  selector: 'bs-dropdown-toggle-test',
  template: `
    <div bsDropdown [closeOnClickOutside]="true">
      <button bsDropdownToggle class="btn btn-primary">Dropdown</button>
      <div *bsDropdownMenu>
        Dropdown contents
      </div>
    </div>`
})
class BsDropdownToggleTestComponent {
}

@Directive({
  selector: '[bsDropdownMenu]',
  // host: {
  //   '[class.show]': 'dropdown.isOpen',
  // },
})
class BsDropdownMenuMockDirective {
}

@Directive({
  selector: '[bsDropdown]',
  providers: [
    { provide: BsDropdownDirective, useExisting: BsDropdownMockDirective }
  ]
})
class BsDropdownMockDirective {

  public isOpen$ = new BehaviorSubject<boolean>(false);

  @ContentChild(BsDropdownMenuMockDirective, {static: false}) menu!: BsDropdownMenuMockDirective;
  @ContentChild(BsDropdownToggleDirective, {static: false}) toggle!: BsDropdownToggleDirective;
  
  @Input() public hasBackdrop = false;
  @Input() public closeOnClickOutside = false;
}

describe('BsDropdownToggleDirective', () => {
  let component: BsDropdownToggleTestComponent;
  let fixture: ComponentFixture<BsDropdownToggleTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsDropdownToggleDirective,

        // Mock directives
        BsDropdownMockDirective,
        BsDropdownMenuMockDirective,

        // Testbench
        BsDropdownToggleTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDropdownToggleTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
