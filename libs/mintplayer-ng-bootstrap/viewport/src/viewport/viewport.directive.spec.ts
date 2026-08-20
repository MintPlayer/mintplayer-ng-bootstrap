import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsInViewportDirective } from './viewport.directive';

/**
 * jsdom ships no IntersectionObserver, so the directive's only collaborator is
 * stubbed here. That is the point rather than a limitation: what is worth
 * asserting is the directive's contract with the observer — that it observes its
 * own element, forwards every entry, disconnects on destroy, and never observes
 * at all on the server — and none of that needs a real intersection engine.
 */
class ObserverStub {
  static instances: ObserverStub[] = [];

  readonly observed: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: IntersectionObserverCallback) {
    ObserverStub.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  disconnect() {
    this.disconnected = true;
  }

  unobserve() {
    // not used by the directive
  }

  /** Drive the callback the way the platform would. */
  fire(...intersecting: boolean[]) {
    const entries = intersecting.map((isIntersecting) => ({ isIntersecting }) as IntersectionObserverEntry);
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

@Component({
  template: `<div (bsInViewport)="onChange($event)"></div>`,
  imports: [BsInViewportDirective],
})
class Harness {
  readonly seen: boolean[] = [];
  onChange(value: boolean) {
    this.seen.push(value);
  }
}

async function render(platformId: object = 'browser') {
  await TestBed.configureTestingModule({
    imports: [Harness],
    providers: [{ provide: PLATFORM_ID, useValue: platformId }],
  }).compileComponents();

  const fixture = TestBed.createComponent(Harness);
  fixture.detectChanges();
  await fixture.whenStable();

  return {
    fixture,
    component: fixture.componentInstance,
    element: fixture.nativeElement.querySelector('div') as HTMLElement,
    observer: ObserverStub.instances.at(-1),
  };
}

describe('BsInViewportDirective', () => {
  let original: typeof IntersectionObserver | undefined;

  beforeEach(() => {
    ObserverStub.instances = [];
    original = (globalThis as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = ObserverStub;
  });

  afterEach(() => {
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = original;
    TestBed.resetTestingModule();
  });

  it('observes its own host element', async () => {
    const { observer, element } = await render();
    expect(observer!.observed).toEqual([element]);
  });

  it('emits when the element enters the viewport', async () => {
    const { observer, component } = await render();
    observer!.fire(true);
    expect(component.seen).toEqual([true]);
  });

  it('emits when the element leaves the viewport', async () => {
    const { observer, component } = await render();
    observer!.fire(true, false);
    expect(component.seen).toEqual([true, false]);
  });

  it('emits once per entry in a single callback', async () => {
    const { observer, component } = await render();
    observer!.fire(true, true, false);
    expect(component.seen).toHaveLength(3);
  });

  it('disconnects the observer on destroy', async () => {
    const { fixture, observer } = await render();
    fixture.destroy();
    expect(observer!.disconnected).toBe(true);
  });

  // The isDestroyed guard exists because a callback can already be queued when
  // the view goes away; emitting then would push into a destroyed component.
  it('does not emit after destroy', async () => {
    const { fixture, observer, component } = await render();
    fixture.destroy();
    observer!.fire(true);
    expect(component.seen).toEqual([]);
  });

  it('is safe to destroy twice', async () => {
    const { fixture } = await render();
    fixture.destroy();
    expect(() => fixture.destroy()).not.toThrow();
  });

  // On the server there is no IntersectionObserver at all — constructing one
  // would throw during SSR, which is why the platform check comes first.
  it('never constructs an observer on the server', async () => {
    const { component } = await render('server');
    expect(ObserverStub.instances).toHaveLength(0);
    expect(component.seen).toEqual([]);
  });

  it('is safe to destroy a server-rendered instance', async () => {
    const { fixture } = await render('server');
    expect(() => fixture.destroy()).not.toThrow();
  });
});
