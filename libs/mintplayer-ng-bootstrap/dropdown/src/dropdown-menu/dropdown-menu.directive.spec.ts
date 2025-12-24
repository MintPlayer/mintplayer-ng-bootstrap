import { Component, ContentChild, Directive, ElementRef, input, model, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
import { BsDropdownMenuDirective } from './dropdown-menu.directive';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'bs-dropdown-menu-test',
  standalone: false,
  template: `
    <div bsDropdown [closeOnClickOutside]="true">
      <button bsDropdownToggle class="btn btn-primary">Dropdown</button>
      <div *bsDropdownMenu>
        Dropdown contents
      </div>
    </div>`
})
class BsDropdownMenuTestComponent {
}

@Directive({
  selector: '[bsDropdownToggle]',
  standalone: false,
})
class BsDropdownToggleMockDirective {

  constructor(toggleButton: ElementRef) {
    this.toggleButton = toggleButton;
  }

  toggleButton: ElementRef;

}

@Directive({
  selector: '[bsDropdown]',
  standalone: false,
  providers: [
    { provide: BsDropdownDirective, useExisting: BsDropdownMockDirective }
  ]
})
class BsDropdownMockDirective {

  elementRef = { nativeElement: document.createElement('div') };
  isOpen = model<boolean>(false);
  hasBackdrop = input(false);
  closeOnClickOutside = input(false);
  sameDropdownWidth = input(false);

  @ContentChild(BsDropdownMenuDirective, {static: false}) menu!: BsDropdownMenuDirective;
  @ContentChild(BsDropdownToggleMockDirective, {static: false}) toggle!: BsDropdownToggleMockDirective;
}

describe('BsDropdownMenuDirective', () => {
  let component: BsDropdownMenuTestComponent;
  let fixture: ComponentFixture<BsDropdownMenuTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule
      ],
      declarations: [
        // Directive to test
        BsDropdownMenuDirective,

        // Mock directives
        BsDropdownMockDirective,
        BsDropdownToggleMockDirective,

        // Testbench
        BsDropdownMenuTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDropdownMenuTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
