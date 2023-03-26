import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsColorWheelComponent } from './color-wheel.component';

describe('BsColorWheelComponent', () => {
  let component: BsColorWheelComponent;
  let fixture: ComponentFixture<BsColorWheelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsColorWheelComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsColorWheelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
