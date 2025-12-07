import { Component, ContentChild, Directive, ElementRef, Input, signal } from '@angular/core';
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

  public isOpenSignal = signal<boolean>(false);

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

// @Component({
//   selector: 'bs-dropdown-menu-test',
//   template: `
//     <div bsDropdown [closeOnClickOutside]="true">
//       <button bsDropdownToggle>Dropdown</button>
//       <div *bsDropdownMenu>
//         Dropdown contents
//       </div>
//     </div>`
// })
// class BsDropdownMenuTestComponent {
// }

// describe('BsDropdownMenuDirective', () => {
//   let component: BsDropdownMenuTestComponent;
//   let fixture: ComponentFixture<BsDropdownMenuTestComponent>;

//   beforeEach(async () => {
//     await TestBed.configureTestingModule(
//       MockBuilder(BsDropdownMenuDirective, BsDropdownModule)
//       .build()
//     )
//     .compileComponents();
//   });

//   beforeEach(() => {
//     fixture = TestBed.createComponent(BsDropdownMenuTestComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create an instance', () => {
//     expect(component).toBeTruthy();
//   });
// });
