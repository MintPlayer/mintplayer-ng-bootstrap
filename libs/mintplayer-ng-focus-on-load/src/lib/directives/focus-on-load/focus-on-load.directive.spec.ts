import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusOnLoadDirective } from './focus-on-load.directive';

/** A component host, as when `autofocus` sits on a wrapper like bs-otp-input. */
@Component({
  selector: 'focus-host',
  host: { tabindex: '-1' },
  template: `<span>host</span>`,
})
class FocusHostComponent {}

@Component({
  selector: 'focus-on-load-test-component',
  imports: [FocusOnLoadDirective, FocusHostComponent],
  template: `
    <input id="bare" type="text" autofocus>
    <input id="bound" type="text" [autofocus]="enabled()">
    @if (showComponentHost()) {
      <focus-host autofocus></focus-host>
    }`,
})
class FocusOnLoadTestComponent {
  readonly enabled = signal<unknown>(false);
  readonly showComponentHost = signal(false);
}

describe('FocusOnLoadDirective', () => {
  let fixture: ComponentFixture<FocusOnLoadTestComponent>;
  let host: FocusOnLoadTestComponent;
  const byId = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [FocusOnLoadTestComponent] }).compileComponents();
    fixture = TestBed.createComponent(FocusOnLoadTestComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('focuses an element with a bare autofocus attribute 10ms after the view initialises', () => {
    fixture.detectChanges();
    vi.advanceTimersByTime(9);
    expect(document.activeElement).not.toBe(byId('bare'));

    vi.advanceTimersByTime(1);
    expect(document.activeElement).toBe(byId('bare'));
  });

  it('does not focus when autofocus is bound to a falsy value', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    fixture.detectChanges();
    vi.advanceTimersByTime(10);
    const focused = focus.mock.contexts;
    expect(focused).toContain(byId('bare'));
    expect(focused).not.toContain(byId('bound'));
  });

  it('focuses when autofocus is bound to a truthy value', () => {
    host.enabled.set('yes');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    fixture.detectChanges();
    vi.advanceTimersByTime(10);
    expect(focus.mock.contexts).toContain(byId('bound'));
  });

  it('reads the binding when the timer fires, not when the view initialised', () => {
    host.enabled.set(true);
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    fixture.detectChanges();
    host.enabled.set(false);
    fixture.detectChanges();
    vi.advanceTimersByTime(10);
    expect(focus.mock.contexts).not.toContain(byId('bound'));
  });

  it('focuses a component host element, not something inside it', () => {
    host.showComponentHost.set(true);
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    fixture.detectChanges();
    vi.advanceTimersByTime(10);
    const componentHost = fixture.nativeElement.querySelector('focus-host') as HTMLElement;
    expect(focus.mock.contexts).toContain(componentHost);
    expect(focus.mock.contexts).not.toContain(componentHost.querySelector('span'));
  });

  it('routes into a host that overrides focus(), as bs-otp-input does', () => {
    host.showComponentHost.set(true);
    fixture.detectChanges();
    const componentHost = fixture.nativeElement.querySelector('focus-host') as HTMLElement & { focus: () => void };
    const override = vi.fn();
    Object.defineProperty(componentHost, 'focus', { value: override, configurable: true });
    vi.advanceTimersByTime(10);
    expect(override).toHaveBeenCalledTimes(1);
  });
});
