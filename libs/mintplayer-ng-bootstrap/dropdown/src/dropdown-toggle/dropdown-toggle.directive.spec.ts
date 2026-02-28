import { Component, ContentChild, Directive, ElementRef, input, model } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
import { BsDropdownToggleDirective } from './dropdown-toggle.directive';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';

@Directive({
  selector: '[bsDropdownMenu]',
  standalone: true,
})
class BsDropdownMenuMockDirective {
}

@Directive({
  selector: '[bsDropdown]',
  standalone: true,
  providers: [
    { provide: BsDropdownDirective, useExisting: BsDropdownMockDirective }
  ]
})
class BsDropdownMockDirective {
  elementRef = { nativeElement: document.createElement('div') };
  isOpen = model<boolean>(false);
  hasBackdrop = input(false);
  closeOnClickOutside = input(true);
  sameDropdownWidth = input(false);

  @ContentChild(BsDropdownMenuMockDirective, {static: false}) menu!: BsDropdownMenuMockDirective;
  @ContentChild(BsDropdownToggleDirective, {static: false}) toggle!: BsDropdownToggleDirective;
}

@Component({
  selector: 'bs-dropdown-toggle-test',
  standalone: true,
  template: `
    <div bsDropdown [closeOnClickOutside]="true">
      <button bsDropdownToggle>Dropdown</button>
      <div *bsDropdownMenu>
        Dropdown contents
      </div>
    </div>`
})
class BsDropdownToggleTestComponent {
}

describe('BsDropdownToggleDirective', () => {
  let component: BsDropdownToggleTestComponent;
  let fixture: ComponentFixture<BsDropdownToggleTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Directive to test
        BsDropdownToggleDirective,

        // Mock directives
        BsDropdownMockDirective,
        BsDropdownMenuMockDirective,

        // Testbench
        BsDropdownToggleTestComponent
      ],
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
