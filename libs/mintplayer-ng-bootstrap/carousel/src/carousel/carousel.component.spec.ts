import { vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { BsSwipeContainerDirective, BsSwipeDirective, BsSwipeViewportDirective } from '@mintplayer/ng-swiper/swiper';
import { BsCarouselComponent } from './carousel.component';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';
import { BsCarouselPlayPauseDirective } from '../carousel-play-pause/carousel-play-pause.directive';

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

  // External-contract tests — verify the rendered carousel still emits the
  // expected ARIA / keyboard surface after the swiper-aria PRD migration
  // (`docs/prd/swiper-aria.md`). The directives now own these attributes;
  // the carousel must not regress what consumers see.
  describe('post-swiper-aria-migration: rendered ARIA contract', () => {
    function visibleSlides(): HTMLElement[] {
      return fixture.debugElement
        .queryAll(By.directive(BsSwipeDirective))
        .map(d => d.nativeElement as HTMLElement)
        .filter(el => el.getAttribute('aria-hidden') !== 'true');
    }

    it('every visible slide carries role="group" + aria-roledescription="slide" + "N of M" label', () => {
      const slides = visibleSlides();
      expect(slides.length).toBe(3);
      slides.forEach((el, i) => {
        expect(el.getAttribute('role')).toBe('group');
        expect(el.getAttribute('aria-roledescription')).toBe('slide');
        expect(el.getAttribute('aria-label')).toBe(`${i + 1} of 3`);
      });
    });

    it('offside (clone) slides carry aria-hidden="true" and no label', () => {
      const all = fixture.debugElement.queryAll(By.directive(BsSwipeDirective));
      const offside = all
        .map(d => d.nativeElement as HTMLElement)
        .filter(el => el.getAttribute('aria-hidden') === 'true');
      // slide animation mode renders 2 offside clones (first + last)
      expect(offside.length).toBe(2);
      for (const el of offside) {
        expect(el.getAttribute('aria-label')).toBeNull();
        expect(el.getAttribute('aria-roledescription')).toBeNull();
      }
    });

    it('the swipe container exposes aria-orientation matching the carousel', () => {
      const container = fixture.debugElement.query(By.directive(BsSwipeContainerDirective)).nativeElement as HTMLElement;
      // CarouselTestComponent uses orientation="vertical"
      expect(container.getAttribute('aria-orientation')).toBe('vertical');
    });

    it('the swipe container advertises aria-keyshortcuts for the active orientation', () => {
      const container = fixture.debugElement.query(By.directive(BsSwipeContainerDirective)).nativeElement as HTMLElement;
      expect(container.getAttribute('aria-keyshortcuts')).toBe('ArrowUp ArrowDown Home End');
    });
  });
});

@Component({
  selector: 'carousel-bundle-host',
  imports: [BsCarouselComponent, BsCarouselImageDirective, BsCarouselPlayPauseDirective],
  template: `
    <bs-carousel [interval]="interval()" [(paused)]="paused" ariaLabel="Test">
      <button *bsCarouselPlayPause="let p" type="button" data-testid="pp" (click)="paused.set(!p)">
        {{ p ? 'Play' : 'Pause' }}
      </button>
      <img *bsCarouselImage src="a.png">
      <img *bsCarouselImage src="b.png">
    </bs-carousel>
  `,
})
class CarouselBundleHost {
  interval = signal<number | null>(null);
  paused = signal(false);
}

describe('BsCarouselComponent — APG bundle (PRD aria-accessibility-audit §13.2)', () => {
  let fixture: ComponentFixture<CarouselBundleHost>;
  let host: CarouselBundleHost;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CarouselBundleHost],
    }).compileComponents();
    fixture = TestBed.createComponent(CarouselBundleHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  const button = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('[data-testid="pp"]');
  const carousel = (): BsCarouselComponent =>
    fixture.debugElement.query(By.directive(BsCarouselComponent)).componentInstance;
  const ariaLive = (): string =>
    fixture.nativeElement.querySelector('.carousel-inner').getAttribute('aria-live');

  it('renders the projected play/pause template inside the carousel', () => {
    expect(button()).toBeTruthy();
    expect(button().textContent?.trim()).toBe('Pause');
  });

  it('clicking the projected button flips the two-way `paused` model', () => {
    expect(host.paused()).toBe(false);
    button().click();
    fixture.detectChanges();
    expect(host.paused()).toBe(true);
    expect(button().textContent?.trim()).toBe('Play');
  });

  it('aria-live = polite when no interval is set (manual nav announces)', () => {
    expect(ariaLive()).toBe('polite');
  });

  it('aria-live flips to off while auto-advance is actively rotating', () => {
    host.interval.set(1000);
    fixture.detectChanges();
    expect(ariaLive()).toBe('off');
  });

  it('aria-live returns to polite when paused, even with an interval set', () => {
    host.interval.set(1000);
    fixture.detectChanges();
    expect(ariaLive()).toBe('off');
    host.paused.set(true);
    fixture.detectChanges();
    expect(ariaLive()).toBe('polite');
  });

  it('does not auto-advance while paused = true', () => {
    host.interval.set(500);
    host.paused.set(true);
    fixture.detectChanges();
    const startIndex = carousel().currentImageIndex();
    vi.advanceTimersByTime(2000);
    expect(carousel().currentImageIndex()).toBe(startIndex);
  });

  it('public play() / pause() toggle the paused model', () => {
    carousel().pause();
    fixture.detectChanges();
    expect(host.paused()).toBe(true);
    carousel().play();
    fixture.detectChanges();
    expect(host.paused()).toBe(false);
  });
});

@Component({
  selector: 'carousel-default-pp-host',
  imports: [BsCarouselComponent, BsCarouselImageDirective],
  template: `
    <bs-carousel [interval]="interval()" ariaLabel="Default">
      <img *bsCarouselImage src="a.png">
      <img *bsCarouselImage src="b.png">
    </bs-carousel>
  `,
})
class CarouselDefaultPpHost {
  interval = signal<number | null>(null);
}

describe('BsCarouselComponent — default Play/Pause fallback', () => {
  let fixture: ComponentFixture<CarouselDefaultPpHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CarouselDefaultPpHost],
    }).compileComponents();
    fixture = TestBed.createComponent(CarouselDefaultPpHost);
    fixture.detectChanges();
  });

  const ppHost = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('.carousel-play-pause');

  it('does NOT render a Play/Pause button when no interval is set and no template is projected', () => {
    expect(ppHost()).toBeNull();
  });

  it('renders the default Play/Pause button when an interval is set and no template is projected', () => {
    fixture.componentInstance.interval.set(2000);
    fixture.detectChanges();
    const host = ppHost();
    expect(host).not.toBeNull();
    const button = host!.querySelector('button');
    expect(button).not.toBeNull();
    expect(button!.textContent?.trim()).toBe('Pause');
    expect(button!.getAttribute('aria-pressed')).toBe('false');
  });
});
