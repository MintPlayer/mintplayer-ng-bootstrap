import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsOverlayStackService } from '@mintplayer/ng-bootstrap/a11y';
import { BsTooltipDirective, TOOLTIP_HIDE_DELAY_MS } from './tooltip.directive';

@Component({
  selector: 'bs-tooltip-directive-test',
  imports: [BsTooltipDirective],
  template: `
    <button type="button" class="trigger" aria-describedby="hint">
      Bottom
      <div class="text-nowrap tip" *bsTooltip="position()">Hello <b>world</b></div>
    </button>
    <span id="hint">A hint</span>`,
})
class HostComponent {
  readonly position = signal<Position>('bottom');
}

describe('BsTooltipDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let container: HTMLElement;
  const trigger = () => fixture.nativeElement.querySelector('.trigger') as HTMLButtonElement;
  const tip = () => container.querySelector('bs-tooltip') as HTMLElement | null;
  const fire = (el: Element, type: string) => {
    el.dispatchEvent(new Event(type, { bubbles: type.startsWith('focus') }));
    TestBed.tick();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [OverlayModule, HostComponent], providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    container = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => vi.useRealTimers());

  it('shows on hover and describes the trigger, keeping the consumer\'s own description', () => {
    fire(trigger(), 'mouseenter');
    expect(tip()?.textContent).toContain('Hello world');
    const ids = trigger().getAttribute('aria-describedby')!.split(' ');
    expect(ids[0]).toBe('hint');
    expect(ids).toHaveLength(2);
    expect(container.querySelector(`#${ids[1]}`)).not.toBeNull();
  });

  it('hides a moment after the pointer leaves, restoring the consumer\'s description', () => {
    fire(trigger(), 'mouseenter');
    fire(trigger(), 'mouseleave');
    expect(tip()).not.toBeNull();
    vi.advanceTimersByTime(TOOLTIP_HIDE_DELAY_MS);
    expect(tip()).toBeNull();
    expect(trigger().getAttribute('aria-describedby')).toBe('hint');
  });

  it('stays while the pointer travels into the tooltip, and hides when it leaves the tooltip', () => {
    fire(trigger(), 'mouseenter');
    fire(trigger(), 'mouseleave');
    const pane = container.querySelector('.cdk-overlay-pane') as HTMLElement;
    fire(pane, 'mouseenter');
    vi.advanceTimersByTime(TOOLTIP_HIDE_DELAY_MS * 2);
    expect(tip()).not.toBeNull();
    fire(pane, 'mouseleave');
    vi.advanceTimersByTime(TOOLTIP_HIDE_DELAY_MS);
    expect(tip()).toBeNull();
  });

  it('shows on keyboard focus and hides on focus loss (WCAG 1.4.13)', () => {
    fire(trigger(), 'focusin');
    expect(tip()).not.toBeNull();
    fire(trigger(), 'focusin');
    expect(container.querySelectorAll('bs-tooltip')).toHaveLength(1);
    fire(trigger(), 'focusout');
    expect(tip()).toBeNull();
  });

  it('Escape dismisses it when it is the top overlay only', () => {
    const stack = TestBed.inject(BsOverlayStackService);
    fire(trigger(), 'mouseenter');
    const above = stack.push();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tip()).not.toBeNull();
    stack.release(above);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tip()).toBeNull();
  });

  it('Escape with nothing shown does nothing', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(trigger().getAttribute('aria-describedby')).toBe('hint');
  });

  it('hides when the window loses focus', () => {
    fire(trigger(), 'mouseenter');
    window.dispatchEvent(new Event('blur'));
    expect(tip()).toBeNull();
  });

  it.each([
    ['bottom', 'bs-tooltip-bottom'],
    ['top', 'bs-tooltip-top'],
    ['start', 'bs-tooltip-start'],
    ['end', 'bs-tooltip-end'],
  ] as const)('position %s renders the %s placement', (position, cls) => {
    fixture.componentInstance.position.set(position);
    fixture.detectChanges();
    fire(trigger(), 'mouseenter');
    expect(container.querySelector(`.${cls}`)).not.toBeNull();
  });

  it('on destroy, hides and stops listening on the trigger', () => {
    const el = trigger();
    fire(el, 'mouseenter');
    fixture.destroy();
    expect(tip()).toBeNull();
    fire(el, 'mouseenter');
    expect(tip()).toBeNull();
  });
});
