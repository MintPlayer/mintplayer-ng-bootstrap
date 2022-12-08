import { Component, Directive, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsDropdownDirective } from './dropdown.directive';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';

@Component({
  selector: 'bs-dropdown-test',
  template: `
    <div bsDropdown [closeOnClickOutside]="true">
      <button bsDropdownToggle class="btn btn-primary">Dropdown</button>
      <div *bsDropdownMenu>
        Dropdown contents
      </div>
    </div>`
})
class BsDropdownTestComponent {
}

@Directive({
  selector: '[bsDropdownToggle]'
})
class BsDropdownToggleMockDirective {

  constructor(toggleButton: ElementRef) {
    this.toggleButton = toggleButton;
  }

  toggleButton: ElementRef;
}

@Directive({
  selector: '[bsDropdownMenu]',
  providers: [
    { provide: BsDropdownMenuDirective, useExisting: BsDropdownMenuMockDirective }
  ]
})
class BsDropdownMenuMockDirective {
}

describe('BsDropdownDirective', () => {
  let component: BsDropdownTestComponent;
  let fixture: ComponentFixture<BsDropdownTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule
      ],
      declarations: [
        // Directive to test
        BsDropdownDirective,

        // Mock directives
        BsDropdownMenuMockDirective,
        BsDropdownToggleMockDirective,

        // Testbench
        BsDropdownTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDropdownTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
