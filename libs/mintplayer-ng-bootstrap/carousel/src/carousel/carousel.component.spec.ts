import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCarouselComponent } from './carousel.component';
import type { MpCarousel } from '@mintplayer/web-components/carousel';

// bs-carousel is a thin wrapper over <mp-carousel>; the slide/swipe behaviour is
// owned (and unit-tested) in the web component + swiper-core. These tests assert
// the wrapper contract: it renders the element, projects children as slides, and
// bridges inputs.
@Component({
  selector: 'carousel-test-component',
  imports: [BsCarouselComponent],
  template: `
    <bs-carousel [orientation]="'vertical'" [indicators]="true" ariaLabel="Photos">
      <img src="a.png" />
      <img src="b.png" />
      <img src="c.png" />
    </bs-carousel>`,
})
class CarouselTestComponent {}

describe('BsCarouselComponent (wrapper)', () => {
  let fixture: ComponentFixture<CarouselTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CarouselTestComponent] }).compileComponents();
    fixture = TestBed.createComponent(CarouselTestComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function mp(): MpCarousel {
    return fixture.nativeElement.querySelector('mp-carousel') as MpCarousel;
  }

  it('renders an <mp-carousel> host', () => {
    expect(mp()).toBeTruthy();
  });

  it('projects child slides into the web component', () => {
    expect(mp().querySelectorAll('img').length).toBe(3);
  });

  it('bridges scalar inputs to the element', () => {
    expect(mp().getAttribute('orientation')).toBe('vertical');
    expect(mp().hasAttribute('indicators')).toBe(true);
    expect(mp().getAttribute('aria-label')).toBe('Photos');
  });
});
