import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterCarouselComponent } from './better-carousel.component';

describe('BetterCarouselComponent', () => {
  let component: BetterCarouselComponent;
  let fixture: ComponentFixture<BetterCarouselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BetterCarouselComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BetterCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
