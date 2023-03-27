import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsLuminosityStripComponent } from './luminosity-strip.component';

describe('BsLuminosityStripComponent', () => {
  let component: BsLuminosityStripComponent;
  let fixture: ComponentFixture<BsLuminosityStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsLuminosityStripComponent ]
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
