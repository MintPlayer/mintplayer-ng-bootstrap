import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MockDirective } from 'ng-mocks';
import { BsSwipeDirective } from '../swipe/swipe.directive';
import { BsSwipeContainerDirective } from './swipe-container.directive';

@Component({
  selector: 'swipe-test-component',
  imports: [BsSwipeContainerDirective, BsSwipeDirective],
  template: `
    <div bsSwipeContainer>
      @for (n of images; track n) {
        <div bsSwipe>Slide {{ n }}</div>
      }
    </div>`
})
class SwipeTestComponent {
  images = ['a', 'b', 'c', 'd'];
}

describe('BsSwipeContainerDirective', () => {
  let fixture: ComponentFixture<SwipeTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        // Unit to test
        BsSwipeContainerDirective,

        // Mock dependencies
        MockDirective(BsSwipeDirective),

        // Testbench
        SwipeTestComponent
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SwipeTestComponent);
  });

  it('should create an instance', () => {
    expect(fixture).toBeTruthy();
  });
});

@Component({
  selector: 'swipe-keyboard-host',
  imports: [BsSwipeContainerDirective, BsSwipeDirective],
  template: `
    <div bsSwipeContainer #c="bsSwipeContainer"
         [orientation]="orientation()"
         [keyboardEvents]="keyboardEvents()">
      @for (n of images; track n) {
        <div bsSwipe>Slide {{ n }}</div>
      }
    </div>
  `,
})
class SwipeKeyboardHost {
  orientation = signal<'horizontal' | 'vertical'>('horizontal');
  keyboardEvents = signal(true);
  images = ['a', 'b', 'c', 'd'];
}

describe('BsSwipeContainerDirective — keyboard navigation + ARIA', () => {
  let fixture: ComponentFixture<SwipeKeyboardHost>;
  let host: SwipeKeyboardHost;
  let containerDir: BsSwipeContainerDirective;
  let containerEl: HTMLElement;

  function dispatch(key: string): KeyboardEvent {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    fixture.detectChanges();
    return ev;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, SwipeKeyboardHost],
    }).compileComponents();
    fixture = TestBed.createComponent(SwipeKeyboardHost);
    host = fixture.componentInstance;
    fixture.detectChanges();

    const debug = fixture.debugElement.query(By.directive(BsSwipeContainerDirective));
    containerDir = debug.injector.get(BsSwipeContainerDirective);
    containerEl = debug.nativeElement as HTMLElement;
  });

  it('aria-orientation host attribute mirrors the [orientation] input', () => {
    expect(containerEl.getAttribute('aria-orientation')).toBe('horizontal');
    host.orientation.set('vertical');
    fixture.detectChanges();
    expect(containerEl.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('aria-keyshortcuts advertises the in-axis arrow keys + Home/End', () => {
    expect(containerEl.getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight Home End');
    host.orientation.set('vertical');
    fixture.detectChanges();
    expect(containerEl.getAttribute('aria-keyshortcuts')).toBe('ArrowUp ArrowDown Home End');
  });

  it('aria-keyshortcuts is removed when keyboardEvents is disabled', () => {
    host.keyboardEvents.set(false);
    fixture.detectChanges();
    expect(containerEl.getAttribute('aria-keyshortcuts')).toBeNull();
  });

  it('ArrowRight calls next() in horizontal orientation; ArrowLeft calls previous()', () => {
    const next = vi.spyOn(containerDir, 'next');
    const previous = vi.spyOn(containerDir, 'previous');

    dispatch('ArrowRight');
    expect(next).toHaveBeenCalledTimes(1);

    dispatch('ArrowLeft');
    expect(previous).toHaveBeenCalledTimes(1);
  });

  it('ArrowDown calls next() in vertical orientation; ArrowUp calls previous()', () => {
    host.orientation.set('vertical');
    fixture.detectChanges();
    const next = vi.spyOn(containerDir, 'next');
    const previous = vi.spyOn(containerDir, 'previous');

    dispatch('ArrowDown');
    expect(next).toHaveBeenCalledTimes(1);

    dispatch('ArrowUp');
    expect(previous).toHaveBeenCalledTimes(1);
  });

  it('off-axis arrows are no-ops and do not preventDefault', () => {
    const next = vi.spyOn(containerDir, 'next');
    const previous = vi.spyOn(containerDir, 'previous');

    const up = dispatch('ArrowUp');
    const down = dispatch('ArrowDown');

    expect(next).not.toHaveBeenCalled();
    expect(previous).not.toHaveBeenCalled();
    expect(up.defaultPrevented).toBe(false);
    expect(down.defaultPrevented).toBe(false);
  });

  it('Home jumps to slide 0; End jumps to the last slide (works in either orientation)', () => {
    const goto = vi.spyOn(containerDir, 'goto');

    dispatch('Home');
    expect(goto).toHaveBeenLastCalledWith(0);

    // Total non-offside slides = 4 (a,b,c,d) so End → goto(3)
    dispatch('End');
    expect(goto).toHaveBeenLastCalledWith(3);

    host.orientation.set('vertical');
    fixture.detectChanges();
    goto.mockClear();
    dispatch('Home');
    expect(goto).toHaveBeenLastCalledWith(0);
    dispatch('End');
    expect(goto).toHaveBeenLastCalledWith(3);
  });

  it('handled keys call preventDefault()', () => {
    expect(dispatch('ArrowRight').defaultPrevented).toBe(true);
    expect(dispatch('Home').defaultPrevented).toBe(true);
    expect(dispatch('End').defaultPrevented).toBe(true);
  });

  it('keyboardEvents = false suppresses all six keys', () => {
    host.keyboardEvents.set(false);
    fixture.detectChanges();
    const next = vi.spyOn(containerDir, 'next');
    const previous = vi.spyOn(containerDir, 'previous');
    const goto = vi.spyOn(containerDir, 'goto');

    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
      dispatch(key);
    }

    expect(next).not.toHaveBeenCalled();
    expect(previous).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });
});
