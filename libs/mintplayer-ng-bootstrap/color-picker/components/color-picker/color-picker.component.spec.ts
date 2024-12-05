import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockDirective } from 'ng-mocks';

import { BsColorPickerComponent } from './color-picker.component';
import { BsAlphaStripComponent } from '../alpha-strip/alpha-strip.component';
import { BsLuminosityStripComponent } from '../luminosity-strip/luminosity-strip.component';
import { BsColorWheelComponent } from '../color-wheel/color-wheel.component';

describe('ColorPickerComponent', () => {
  let component: BsColorPickerComponent;
  let fixture: ComponentFixture<BsColorPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsColorPickerComponent,

        // Mock dependencies
        MockComponent(BsAlphaStripComponent),
        MockComponent(BsLuminosityStripComponent),
        MockComponent(BsColorWheelComponent),
      ],
      imports: [
        // Mock dependencies
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsColorPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
