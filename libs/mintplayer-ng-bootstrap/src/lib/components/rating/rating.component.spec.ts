import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsRatingComponent } from './rating.component';

describe('BsRatingComponent', () => {
  let component: BsRatingComponent;
  let fixture: ComponentFixture<BsRatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsRatingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsRatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
