import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { BsSwipeContainerDirective, BsSwipeDirective, BsSwipeViewportDirective } from '@mintplayer/ng-swiper/swiper';
import { BsCarouselComponent } from './carousel.component';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Component({
  selector: 'carousel-test-component',
  imports: [BsCarouselComponent, BsCarouselImageDirective],
  template: `
    <bs-carousel orientation="vertical" animation="slide">
      <img *bsCarouselImage src="a.png">
      <img *bsCarouselImage src="b.png">
      <img *bsCarouselImage src="c.png">
    </bs-carousel>`
})
class CarouselTestComponent {}

describe('BsCarouselComponent', () => {
  let fixture: ComponentFixture<CarouselTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CarouselTestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CarouselTestComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture).toBeTruthy();
  });

  // Regression-locking tests for Firefox Android pull-to-refresh suppression.
  // PR #297 fixed a regression where bsSwipeViewport went missing from the
  // .carousel-inner gesture viewport, breaking Firefox Android's PTR
  // suppression. These tests assert the directive composition stays correct.
  describe('Firefox Android PTR-suppression structure', () => {
    it('puts bsSwipeViewport on the .carousel-inner overflow:hidden wrapper', () => {
      const viewport = fixture.debugElement.query(By.directive(BsSwipeViewportDirective));
      expect(viewport).toBeTruthy();
      expect(viewport.nativeElement.classList.contains('carousel-inner')).toBe(true);
    });

    it('places bsSwipeContainer as a descendant of bsSwipeViewport', () => {
      const viewport = fixture.debugElement.query(By.directive(BsSwipeViewportDirective));
      const container = fixture.debugElement.query(By.directive(BsSwipeContainerDirective));
      expect(container).toBeTruthy();
      expect(viewport.nativeElement.contains(container.nativeElement)).toBe(true);
    });

    it('puts bsSwipe on every .carousel-item slide', () => {
      const slides = fixture.debugElement.queryAll(By.directive(BsSwipeDirective));
      expect(slides.length).toBeGreaterThan(0);
      for (const slide of slides) {
        expect(slide.nativeElement.classList.contains('carousel-item')).toBe(true);
      }
    });
  });
});
