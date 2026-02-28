import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsSliderComponent } from './slider.component';

describe('BsSliderComponent', () => {
  let component: BsSliderComponent;
  let fixture: ComponentFixture<BsSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BsSliderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
