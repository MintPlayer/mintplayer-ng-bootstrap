import { Directive, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
import { MockModule } from 'ng-mocks';

import { BsTypeaheadComponent } from './typeahead.component';


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

describe('TypeaheadComponent', () => {
  let component: BsTypeaheadComponent;
  let fixture: ComponentFixture<BsTypeaheadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsHasOverlayModule),
      ],
      declarations: [
        // Unit to test
        BsTypeaheadComponent,
      
        // // Mock dependencies
        ClickOutsideMockDirective,
        BsDropdownMenuMockDirective,
        BsDropdownMockDirective,
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTypeaheadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
