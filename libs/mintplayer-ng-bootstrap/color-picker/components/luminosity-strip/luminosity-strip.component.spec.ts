import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsSliderComponent } from '../slider/slider.component';

import { BsLuminosityStripComponent } from './luminosity-strip.component';

describe('BsLuminosityStripComponent', () => {
  let component: BsLuminosityStripComponent;
  let fixture: ComponentFixture<BsLuminosityStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        BsLuminosityStripComponent,

        // Mock dependencies
        MockComponent(BsSliderComponent),
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsLuminosityStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
