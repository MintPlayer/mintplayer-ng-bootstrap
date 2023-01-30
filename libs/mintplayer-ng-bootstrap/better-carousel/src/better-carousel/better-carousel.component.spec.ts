import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsBetterCarouselComponent } from './better-carousel.component';

describe('BsBetterCarouselComponent', () => {
  let component: BsBetterCarouselComponent;
  let fixture: ComponentFixture<BsBetterCarouselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsBetterCarouselComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsBetterCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
