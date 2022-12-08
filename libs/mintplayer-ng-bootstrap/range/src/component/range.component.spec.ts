import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsRangeComponent } from './range.component';

describe('BsRangeComponent', () => {
  let component: BsRangeComponent;
  let fixture: ComponentFixture<BsRangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsRangeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsRangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
