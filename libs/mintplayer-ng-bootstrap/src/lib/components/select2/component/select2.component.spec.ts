import { Directive, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { BsSelect2Component } from './select2.component';

@Directive({ selector: '[clickOutside]' })
class ClickOutsideMockDirective {
}

@Directive({ selector: '[bsDropdownMenu]' })
class BsDropdownMenuMockDirective extends ClickOutsideMockDirective {
}

@Directive({ selector: '[bsDropdown]' })
class BsDropdownMockDirective {
  
  //#region IsOpen
  @Input() public isOpen = false;
  @Output() public isOpenChange = new EventEmitter<boolean>();
  //#endregion

  @Input() public hasBackdrop = false;
  @Input() public closeOnClickOutside = false;
}

describe('BsSelect2Component', () => {
  let component: BsSelect2Component;
  let fixture: ComponentFixture<BsSelect2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsSelect2Component,

        // Mock dependencies
        ClickOutsideMockDirective,
        BsDropdownMenuMockDirective,
        BsDropdownMockDirective,
      ],
      imports: [
        FormsModule
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsSelect2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
