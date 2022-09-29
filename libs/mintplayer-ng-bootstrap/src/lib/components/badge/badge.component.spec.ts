import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsBadgeComponent } from './badge.component';

describe('BsBadgeComponent', () => {
  let component: BsBadgeComponent;
  let fixture: ComponentFixture<BsBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
