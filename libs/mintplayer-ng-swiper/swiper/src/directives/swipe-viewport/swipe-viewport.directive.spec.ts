import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BsSwipeViewportDirective } from './swipe-viewport.directive';

@Component({
  selector: 'viewport-host',
  imports: [BsSwipeViewportDirective],
  template: `
    <div bsSwipeViewport
         [ariaLive]="ariaLive()"
         [ariaAtomic]="ariaAtomic()"
         [ariaRelevant]="ariaRelevant()"
         [ariaBusy]="ariaBusy()">
      content
    </div>
  `,
})
class ViewportHost {
  ariaLive = signal<'off' | 'polite' | 'assertive'>('off');
  ariaAtomic = signal<boolean | null>(false);
  ariaRelevant = signal<string | null>(null);
  ariaBusy = signal<boolean | null>(null);
}

describe('BsSwipeViewportDirective', () => {
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
});
