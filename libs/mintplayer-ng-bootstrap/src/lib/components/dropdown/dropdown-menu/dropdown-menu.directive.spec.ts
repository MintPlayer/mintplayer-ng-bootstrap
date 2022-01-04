import { Component, ContentChild, Directive, ElementRef, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
import { BehaviorSubject } from 'rxjs';
import { BsDropdownMenuDirective } from './dropdown-menu.directive';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'bs-dropdown-menu-test',
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
  selector: '[bsDropdownToggle]'
})
class BsDropdownToggleMockDirective {

  constructor(toggleButton: ElementRef) {
    this.toggleButton = toggleButton;
  }

  toggleButton: ElementRef;

}

@Directive({
  selector: '[bsDropdown]',
  providers: [
    { provide: BsDropdownDirective, useExisting: BsDropdownMockDirective }
  ]
})
class BsDropdownMockDirective {

  public isOpen$ = new BehaviorSubject<boolean>(false);

  @ContentChild(BsDropdownMenuDirective, {static: false}) menu!: BsDropdownMenuDirective;
  @ContentChild(BsDropdownToggleMockDirective, {static: false}) toggle!: BsDropdownToggleMockDirective;
  
  @Input() public hasBackdrop = false;
  @Input() public closeOnClickOutside = false;
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
