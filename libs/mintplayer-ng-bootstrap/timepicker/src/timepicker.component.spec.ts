import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsDropdownDirective, BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { MockComponent, MockDirective } from 'ng-mocks';

import { BsTimepickerComponent } from './timepicker.component';

describe('BsTimepickerComponent', () => {
  let component: BsTimepickerComponent;
  let fixture: ComponentFixture<BsTimepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        BsTimepickerComponent,
        
        // Mock dependencies
        FormsModule,
        MockDirective(BsButtonTypeDirective),
        MockComponent(BsInputGroupComponent),
        MockComponent(BsHasOverlayComponent),
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockDirective(BsDropdownDirective), MockDirective(BsDropdownMenuDirective), MockDirective(BsDropdownToggleDirective),
      ],
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
