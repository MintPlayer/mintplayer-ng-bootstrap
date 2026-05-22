import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { BsSwipeContainerDirective } from '../swipe-container/swipe-container.directive';
import { BsSwipeDirective } from '../swipe/swipe.directive';
import { BsSwipeViewportDirective } from './swipe-viewport.directive';
@Component({
  selector: 'viewport-host',
  imports: [BsSwipeViewportDirective],
  template: `
    <div bsSwipeViewport
         [tabIndex]="tabIndex()"
         [ariaLive]="ariaLive()"
         [ariaAtomic]="ariaAtomic()"
         [ariaRelevant]="ariaRelevant()"
         [ariaBusy]="ariaBusy()">
      content
    </div>
  `,
})
class ViewportHost {
  tabIndex = signal<number | null>(0);
  ariaLive = signal<'off' | 'polite' | 'assertive'>('off');
  ariaAtomic = signal<boolean | null>(false);
  ariaRelevant = signal<string | null>(null);
  ariaBusy = signal<boolean | null>(null);
}

describe('BsSwipeViewportDirective — live region + tabindex', () => {
  let fixture: ComponentFixture<ViewportHost>;
  let host: ViewportHost;
  let viewport: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewportHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ViewportHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    viewport = fixture.debugElement.query(By.directive(BsSwipeViewportDirective)).nativeElement;
  });

  it('defaults aria-live to "off"', () => {
    expect(viewport.getAttribute('aria-live')).toBe('off');
  });

  it('flips aria-live to polite / assertive via the input', () => {
    host.ariaLive.set('polite');
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-live')).toBe('polite');

    host.ariaLive.set('assertive');
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-live')).toBe('assertive');
  });

  it('defaults aria-atomic to "false"', () => {
    expect(viewport.getAttribute('aria-atomic')).toBe('false');
  });

  it('aria-atomic accepts true and null (removed)', () => {
    host.ariaAtomic.set(true);
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-atomic')).toBe('true');

    host.ariaAtomic.set(null);
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-atomic')).toBeNull();
  });

  it('aria-relevant is absent by default and reflects consumer-supplied strings', () => {
    expect(viewport.getAttribute('aria-relevant')).toBeNull();

    host.ariaRelevant.set('all');
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-relevant')).toBe('all');

    host.ariaRelevant.set('additions text');
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-relevant')).toBe('additions text');
  });

  it('aria-busy is absent by default and reflects consumer-supplied booleans', () => {
    expect(viewport.getAttribute('aria-busy')).toBeNull();

    host.ariaBusy.set(true);
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-busy')).toBe('true');

    host.ariaBusy.set(false);
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-busy')).toBe('false');

    host.ariaBusy.set(null);
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-busy')).toBeNull();
  });

  it('keeps the load-bearing layout styles', () => {
    expect(viewport.style.overscrollBehavior).toBe('contain');
    expect(viewport.style.pointerEvents).toBe('none');
  });

  it('defaults tabindex to "0" so the viewport is a tab stop', () => {
    expect(viewport.getAttribute('tabindex')).toBe('0');
  });

  it('removes tabindex when the input is null (opt-out)', () => {
    host.tabIndex.set(null);
    fixture.detectChanges();
    expect(viewport.getAttribute('tabindex')).toBeNull();
  });

  it('honours -1 for programmatic-only focus', () => {
    host.tabIndex.set(-1);
    fixture.detectChanges();
    expect(viewport.getAttribute('tabindex')).toBe('-1');
  });
});

@Component({
  selector: 'viewport-with-container-host',
  imports: [BsSwipeViewportDirective, BsSwipeContainerDirective, BsSwipeDirective],
  template: `
    <div bsSwipeViewport>
      <div bsSwipeContainer
           [orientation]="orientation()"
           [keyboardEvents]="keyboardEvents()">
        @for (n of slides; track n) {
          <div bsSwipe>{{ n }}</div>
        }
      </div>
    </div>
  `,
})
class ViewportWithContainerHost {
  orientation = signal<'horizontal' | 'vertical'>('horizontal');
  keyboardEvents = signal(true);
  slides = ['a', 'b', 'c'];
}

describe('BsSwipeViewportDirective — forwards container ARIA + delegates keys', () => {
  let fixture: ComponentFixture<ViewportWithContainerHost>;
  let host: ViewportWithContainerHost;
  let viewport: HTMLElement;
  let container: BsSwipeContainerDirective;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ViewportWithContainerHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ViewportWithContainerHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    viewport = fixture.debugElement.query(By.directive(BsSwipeViewportDirective)).nativeElement as HTMLElement;
    container = fixture.debugElement.query(By.directive(BsSwipeContainerDirective)).injector.get(BsSwipeContainerDirective);
  });

  it('forwards aria-orientation from the inner container', () => {
    expect(viewport.getAttribute('aria-orientation')).toBe('horizontal');
    host.orientation.set('vertical');
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('forwards aria-keyshortcuts from the inner container', () => {
    expect(viewport.getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight Home End');
    host.orientation.set('vertical');
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-keyshortcuts')).toBe('ArrowUp ArrowDown Home End');
  });

  it('aria-keyshortcuts disappears when the container disables keyboard handling', () => {
    host.keyboardEvents.set(false);
    fixture.detectChanges();
    expect(viewport.getAttribute('aria-keyshortcuts')).toBeNull();
  });

  it('delegates a viewport-targeted keydown to container.onKeyPress', () => {
    const onKeyPress = vi.spyOn(container, 'onKeyPress');
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    viewport.dispatchEvent(ev);
    fixture.detectChanges();
    expect(onKeyPress).toHaveBeenCalledTimes(1);
  });

  it('drops keydowns whose target is a focusable descendant (e.g., a slide input)', () => {
    // Append an input inside a slide and dispatch from there.
    const slide = viewport.querySelector('[bsSwipe]') as HTMLElement;
    expect(slide).not.toBeNull();
    const innerInput = document.createElement('input');
    slide.appendChild(innerInput);

    const onKeyPress = vi.spyOn(container, 'onKeyPress');
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    innerInput.dispatchEvent(ev);
    fixture.detectChanges();
    expect(onKeyPress).not.toHaveBeenCalled();
  });
});

@Component({
  selector: 'standalone-viewport-host',
  imports: [BsSwipeViewportDirective],
  template: `<div bsSwipeViewport>just a viewport</div>`,
})
class StandaloneViewportHost {}

describe('BsSwipeViewportDirective — standalone (no container inside)', () => {
  it('omits aria-orientation + aria-keyshortcuts when no container is found', async () => {
    await TestBed.configureTestingModule({
      imports: [StandaloneViewportHost],
    }).compileComponents();
    const fixture = TestBed.createComponent(StandaloneViewportHost);
    fixture.detectChanges();
    const viewport = fixture.debugElement.query(By.directive(BsSwipeViewportDirective)).nativeElement as HTMLElement;
    expect(viewport.getAttribute('aria-orientation')).toBeNull();
    expect(viewport.getAttribute('aria-keyshortcuts')).toBeNull();
  });
});
