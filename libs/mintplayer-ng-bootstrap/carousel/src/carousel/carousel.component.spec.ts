import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { CarouselAnimation } from '@mintplayer/web-components/carousel';
import { BsCarouselComponent } from './carousel.component';
// Loaded up front: the wrapper imports it lazily after the first render, and that import
// would otherwise still be resolving when the test environment is torn down.
import '@mintplayer/web-components/carousel';

@Component({
  imports: [BsCarouselComponent],
  template: `
    <bs-carousel [animation]="animation()" [indicators]="indicators()" [interval]="interval()"
      [wrap]="wrap()" [keyboardEvents]="keyboard()" [(paused)]="paused"
      (slideChange)="events.push('slide:' + $event)" (animationStart)="events.push('start')" (animationEnd)="events.push('end')"
      (click)="hostClicks = hostClicks + 1">
      <img src="a.png" alt="A">
      <img src="b.png" alt="B">
    </bs-carousel>`,
})
class HostComponent {
  readonly animation = signal<CarouselAnimation>('slide');
  readonly indicators = signal(false);
  readonly interval = signal<number | null>(null);
  readonly wrap = signal(true);
  readonly keyboard = signal(true);
  readonly paused = signal(false);
  readonly events: string[] = [];
  hostClicks = 0;
}

describe('BsCarouselComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const wc = () => fixture.nativeElement.querySelector('mp-carousel') as HTMLElement;
  const carousel = () => fixture.debugElement.query(By.directive(BsCarouselComponent)).componentInstance as BsCarouselComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('maps the inputs onto the element\'s attributes, omitting the defaults', () => {
    const el = wc();
    expect(el.getAttribute('animation')).toBe('slide');
    expect(el.getAttribute('orientation')).toBe('horizontal');
    expect(el.hasAttribute('indicators')).toBe(false);
    expect(el.hasAttribute('interval')).toBe(false);
    expect(el.hasAttribute('wrap')).toBe(false);
    expect(el.hasAttribute('keyboard-events')).toBe(false);
    expect(el.hasAttribute('paused')).toBe(false);

    const h = fixture.componentInstance;
    h.animation.set('fade');
    h.indicators.set(true);
    h.interval.set(4000);
    h.wrap.set(false);
    h.keyboard.set(false);
    h.paused.set(true);
    fixture.detectChanges();
    expect(el.getAttribute('animation')).toBe('fade');
    expect(el.getAttribute('indicators')).toBe('');
    expect(el.getAttribute('interval')).toBe('4000');
    expect(el.getAttribute('wrap')).toBe('false');
    expect(el.getAttribute('keyboard-events')).toBe('false');
    expect(el.getAttribute('paused')).toBe('');
  });

  it('treats an interval of 0 as no autoplay', () => {
    fixture.componentInstance.interval.set(0);
    fixture.detectChanges();
    expect(wc().hasAttribute('interval')).toBe(false);
  });

  it('projects the slides into the element', () => {
    expect([...wc().querySelectorAll('img')].map((i) => i.alt)).toEqual(['A', 'B']);
  });

  it('previous / next / goto call through to the element', () => {
    const previous = vi.fn();
    const next = vi.fn();
    const goto = vi.fn();
    Object.assign(wc(), { previous, next, goto });
    carousel().previous();
    carousel().next();
    carousel().goto(1);
    expect(previous).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
    expect(goto).toHaveBeenCalledWith(1);
  });

  it('play, pause and togglePaused drive [(paused)]', () => {
    carousel().pause();
    expect(fixture.componentInstance.paused()).toBe(true);
    carousel().play();
    expect(fixture.componentInstance.paused()).toBe(false);
    carousel().togglePaused();
    expect(fixture.componentInstance.paused()).toBe(true);
  });

  it('re-emits the element\'s events as typed outputs, without the raw event reaching the host', () => {
    const el = wc();
    const fire = (type: string, detail?: unknown) =>
      el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    fire('slide-change', { index: 1 });
    fire('animation-start');
    fire('animation-end');
    fire('paused-change', { paused: true });
    expect(fixture.componentInstance.events).toEqual(['slide:1', 'start', 'end']);
    expect(fixture.componentInstance.paused()).toBe(true);
  });
});
