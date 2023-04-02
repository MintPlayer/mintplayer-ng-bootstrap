import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsSliderComponent } from '../slider/slider.component';

import { BsAlphaStripComponent } from './alpha-strip.component';

describe('BsAlphaStripComponent', () => {
  let component: BsAlphaStripComponent;
  let fixture: ComponentFixture<BsAlphaStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsAlphaStripComponent,

        // Mock dependencies
        MockComponent(BsSliderComponent),
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsAlphaStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
