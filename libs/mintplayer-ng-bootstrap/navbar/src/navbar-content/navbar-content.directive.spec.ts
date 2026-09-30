import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsNavbarComponent } from '../navbar/navbar.component';
import { BsNavbarContentDirective } from './navbar-content.directive';

@Component({
  imports: [BsNavbarComponent, BsNavbarContentDirective],
  template: `
    <bs-navbar [positioning]="'fixed'" #nav></bs-navbar>
    <main [bsNavbarContent]="nav" style="padding-top: 58px">Page</main>`,
})
class HostComponent {}

/** A ResizeObserver the test can fire: jsdom lays nothing out, so none ever would. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observed: Element[] = [];
  disconnected = false;
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element) { this.observed.push(el); }
  unobserve() { /* not used */ }
  disconnect() { this.disconnected = true; }
  fire() { this.callback([], this as unknown as ResizeObserver); }
}

describe('BsNavbarContentDirective', () => {
  const original = globalThis.ResizeObserver;
  beforeEach(() => {
    FakeResizeObserver.instances = [];
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
  });
  afterEach(() => {
    globalThis.ResizeObserver = original;
  });

  it('on the server, clears the bar by a fixed approximation', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    TestBed.overrideComponent(HostComponent, {
      set: { template: `<bs-navbar #nav></bs-navbar><main [bsNavbarContent]="nav">Page</main>` },
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('main') as HTMLElement).style.paddingTop).toBe(`${BsNavbarContentDirective.SSR_NAVBAR_HEIGHT}px`);
  });

  it('in the browser, drops the server approximation and follows the bar\'s measured height', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    const [observer] = FakeResizeObserver.instances.filter((o) => o.observed.some((el) => el.tagName === 'MP-NAVBAR'));
    expect(observer).toBeDefined();
    // removed before measuring, so it is not counted twice
    expect(main.style.paddingTop).toBe('');
    observer.fire();
    // jsdom's bar is 0px tall and the author set no padding of their own
    expect(main.style.paddingTop).toBe('0px');
  });

  it('stops observing when destroyed', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const [observer] = FakeResizeObserver.instances.filter((o) => o.observed.some((el) => el.tagName === 'MP-NAVBAR'));
    fixture.destroy();
    expect(observer.disconnected).toBe(true);
  });
});
