import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsDropdownDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsInputGroupModule } from '@mintplayer/ng-bootstrap/input-group';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';

import { BsTimepickerComponent } from './timepicker.component';

describe('BsTimepickerComponent', () => {
  let component: BsTimepickerComponent;
  let fixture: ComponentFixture<BsTimepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsIconModule),
        MockModule(BsButtonTypeModule),
        MockModule(BsInputGroupModule),
        MockModule(BsHasOverlayModule),
      ],
      declarations: [
        // Unit to test
        BsTimepickerComponent,

        // Mock dependencies
        MockComponent(BsFormComponent),
        MockDirective(BsDropdownDirective),
        // BsDropdownMockDirective,
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
