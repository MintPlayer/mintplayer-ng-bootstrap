import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsSliderComponent } from '../slider/slider.component';
import { BsBrightnessStripComponent } from './brightness-strip.component';
describe('BsBrightnessStripComponent', () => {
  let component: BsBrightnessStripComponent;
  let fixture: ComponentFixture<BsBrightnessStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsBrightnessStripComponent,
        MockComponent(BsSliderComponent),
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsBrightnessStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
