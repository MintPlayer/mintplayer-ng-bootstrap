import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsFloatingLabelComponent } from './floating-label.component';

describe('BsFloatingLabelComponent', () => {
  let component: BsFloatingLabelComponent;
  let fixture: ComponentFixture<BsFloatingLabelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsFloatingLabelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsFloatingLabelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
