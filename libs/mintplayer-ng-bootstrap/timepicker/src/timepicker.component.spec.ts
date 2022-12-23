import { Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsInputGroupModule } from '@mintplayer/ng-bootstrap/input-group';
import { MockModule } from 'ng-mocks';

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
      imports: [
        FormsModule,
        MockModule(BsButtonTypeModule),
        MockModule(BsInputGroupModule),
        MockModule(BsHasOverlayModule),
      ],
      declarations: [
        // Unit to test
        BsTimepickerComponent,

        // Mock dependencies
        BsDropdownMockDirective,
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
