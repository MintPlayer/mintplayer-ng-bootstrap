import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SchedulerEvent } from '@mintplayer/web-components/scheduler-core';
import { InputHandler, InputHandlerCallbacks } from './input-handler';

/**
 * InputHandler in isolation: a real shadow root holding the class names the
 * views render, real DOM events, fake timers for the touch hold. Nothing here
 * reads layout; the only coordinates are the ones the events carry.
 */

const EVENT: SchedulerEvent = {
  id: 'e1',
  title: 'Standup',
  start: new Date(2026, 4, 12, 9, 0),
  end: new Date(2026, 4, 12, 9, 30),
};

interface Harness {
  host: HTMLElement;
  root: ShadowRoot;
  handler: InputHandler;
  callbacks: { [K in keyof Required<InputHandlerCallbacks>]: ReturnType<typeof vi.fn> };
  container: HTMLElement;
  content: HTMLElement;
  slot: HTMLElement;
  slotInner: HTMLElement;
  event: HTMLElement;
  handle: HTMLElement;
  preview: HTMLElement;
  unknownEvent: HTMLElement;
  outside: HTMLElement;
  flags: { editable: boolean; selectable: boolean; selectedId: string | null };
}

let h: Harness;

function setup(config: { touchHoldDuration?: number; touchMoveThreshold?: number } = {}): Harness {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <div class="scheduler-container">
      <div class="scheduler-content">
        <div class="scheduler-time-slot" data-start="2026-05-12T09:00:00" data-end="2026-05-12T09:30:00">
          <span class="slot-inner"></span>
        </div>
        <div class="scheduler-event" data-event-id="e1">
          <span class="title">Standup</span>
          <div class="resize-handle" data-handle="end"></div>
        </div>
        <div class="scheduler-event preview" data-event-id="e1"></div>
        <div class="scheduler-event" data-event-id="ghost">
          <div class="resize-handle" data-handle="start"></div>
        </div>
        <div class="outside"></div>
      </div>
    </div>`;
  const q = (s: string) => root.querySelector<HTMLElement>(s)!;
  const flags = { editable: true, selectable: true, selectedId: null as string | null };
  const content = q('.scheduler-content');
  const callbacks = {
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onClick: vi.fn(),
    onDoubleClick: vi.fn(),
    onTouchDragActivated: vi.fn(),
    onTouchDragDeactivated: vi.fn(),
    onPointerCancel: vi.fn(),
    getScrollContainer: vi.fn(() => content),
  };
  const handler = new InputHandler(
    {
      shadowRoot: root,
      getEventById: (id) => (id === 'e1' ? EVENT : null),
      isEditable: () => flags.editable,
      isSelectable: () => flags.selectable,
      isEventSelected: (id) => flags.selectedId === id,
      ...config,
    },
    callbacks,
  );
  handler.attach();
  return {
    host,
    root,
    handler,
    callbacks,
    container: q('.scheduler-container'),
    content,
    slot: q('.scheduler-time-slot'),
    slotInner: q('.slot-inner'),
    event: q('.scheduler-event[data-event-id="e1"]:not(.preview) .title'),
    handle: q('.scheduler-event[data-event-id="e1"] .resize-handle'),
    preview: q('.scheduler-event.preview'),
    unknownEvent: q('.scheduler-event[data-event-id="ghost"] .resize-handle'),
    outside: q('.outside'),
    flags,
  };
}

function mouse(type: string, target: EventTarget, x = 10, y = 10): MouseEvent {
  const ev = new MouseEvent(type, { bubbles: true, composed: true, cancelable: true, clientX: x, clientY: y });
  target.dispatchEvent(ev);
  return ev;
}

function touchPoint(target: EventTarget, x: number, y: number, identifier = 0): Touch {
  return { identifier, target, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y } as unknown as Touch;
}

/** Dispatch a touch event on `target`. `fingers` are the touches still down. */
function touch(type: string, target: EventTarget, x = 10, y = 10, fingers?: number): TouchEvent {
  const point = touchPoint(target, x, y);
  const down = type === 'touchend' || type === 'touchcancel' ? [] : [point];
  const touches = fingers ? Array.from({ length: fingers }, (_, i) => touchPoint(target, x, y, i)) : down;
  const ev = new TouchEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    touches,
    targetTouches: touches,
    changedTouches: [point],
  });
  target.dispatchEvent(ev);
  return ev;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  h?.handler.detach();
  h?.host.remove();
  vi.useRealTimers();
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
});

describe('InputHandler — mouse', () => {
  it('a mousedown on a slot starts a gesture and suppresses text selection', () => {
    h = setup();
    const ev = mouse('mousedown', h.slotInner, 42, 24);
    expect(h.callbacks.onPointerDown).toHaveBeenCalledTimes(1);
    const [pointer, target] = h.callbacks.onPointerDown.mock.calls[0];
    expect(pointer).toMatchObject({ pointerType: 'mouse', clientX: 42, clientY: 24, isPrimary: true });
    expect(target).toEqual({ type: 'slot', slotElement: h.slot });
    expect(ev.defaultPrevented).toBe(true);
  });

  it('a mousedown on an event resolves the event, and on its handle resolves the edge', () => {
    h = setup();
    mouse('mousedown', h.event);
    mouse('mousedown', h.handle);
    expect(h.callbacks.onPointerDown.mock.calls[0][1]).toEqual({ type: 'event', event: EVENT });
    expect(h.callbacks.onPointerDown.mock.calls[1][1]).toEqual({
      type: 'resize-handle',
      event: EVENT,
      resizeHandle: 'end',
    });
  });

  it('a drag ghost and an element for an unknown event are not drag sources', () => {
    h = setup();
    mouse('mousedown', h.preview);
    mouse('mousedown', h.unknownEvent);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
    expect(h.handler.analyzeTarget(h.unknownEvent)).toEqual({ type: 'none' });
  });

  it('a mousedown outside every slot and event is left to the browser', () => {
    h = setup();
    const ev = mouse('mousedown', h.outside);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });

  it('a read-only scheduler starts no mouse gesture', () => {
    h = setup();
    h.flags.editable = false;
    mouse('mousedown', h.slot);
    mouse('mousedown', h.event);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
  });

  it('without range selection a slot mousedown is ignored but an event mousedown is not', () => {
    h = setup();
    h.flags.selectable = false;
    mouse('mousedown', h.slot);
    mouse('mousedown', h.event);
    expect(h.callbacks.onPointerDown).toHaveBeenCalledTimes(1);
    expect(h.callbacks.onPointerDown.mock.calls[0][1].type).toBe('event');
  });

  it('mouse moves and releases are heard at document level, outside the scheduler too', () => {
    h = setup();
    mouse('mousemove', document.body, 5, 6);
    mouse('mouseup', document.body, 7, 8);
    expect(h.callbacks.onPointerMove.mock.calls[0][0]).toMatchObject({ clientX: 5, clientY: 6 });
    expect(h.callbacks.onPointerUp.mock.calls[0][0]).toMatchObject({ clientX: 7, clientY: 8 });
  });

  it('a click on a slot is reported, a click on an event or handle is left to the drag pipeline', () => {
    h = setup();
    mouse('click', h.slot);
    mouse('click', h.event);
    mouse('click', h.handle);
    expect(h.callbacks.onClick).toHaveBeenCalledTimes(1);
    expect(h.callbacks.onClick.mock.calls[0][1]).toEqual({ type: 'slot', slotElement: h.slot });
  });

  it('a double-click reports whatever it landed on', () => {
    h = setup();
    mouse('dblclick', h.event);
    expect(h.callbacks.onDoubleClick.mock.calls[0][1]).toEqual({ type: 'event', event: EVENT });
  });

  it('detach stops every listener', () => {
    h = setup();
    h.handler.detach();
    mouse('mousedown', h.slot);
    mouse('mousemove', document.body);
    mouse('click', h.slot);
    touch('touchstart', h.slot);
    vi.advanceTimersByTime(1000);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
    expect(h.callbacks.onPointerMove).not.toHaveBeenCalled();
    expect(h.callbacks.onClick).not.toHaveBeenCalled();
  });
});

describe('InputHandler — device tracking', () => {
  it('reports the device of the gesture in progress, even on a read-only scheduler', () => {
    h = setup();
    h.flags.editable = false;
    expect(h.handler.isTouchGesture()).toBe(false);
    touch('touchstart', h.slot);
    expect(h.handler.isTouchGesture()).toBe(true);
    mouse('mousedown', h.slot);
    expect(h.handler.isTouchGesture()).toBe(false);
  });
});

describe('InputHandler — touch hold-to-drag', () => {
  it('a quick tap is a click on its target, never a drag', () => {
    h = setup();
    touch('touchstart', h.slotInner);
    expect(h.slot.classList.contains('touch-hold-pending')).toBe(true);
    vi.advanceTimersByTime(200);
    touch('touchend', h.slotInner);
    expect(h.callbacks.onClick).toHaveBeenCalledTimes(1);
    expect(h.callbacks.onClick.mock.calls[0][1]).toEqual({ type: 'slot', slotElement: h.slot });
    expect(h.slot.classList.contains('touch-hold-pending')).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
  });

  it('holding for 600ms arms the drag and locks the page against scrolling', () => {
    h = setup();
    document.body.style.overflow = 'scroll';
    touch('touchstart', h.event, 30, 40);
    vi.advanceTimersByTime(599);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(h.handler.isInTouchDragMode()).toBe(true);
    expect(h.callbacks.onTouchDragActivated).toHaveBeenCalledTimes(1);
    const [pointer, target, immediate] = h.callbacks.onPointerDown.mock.calls[0];
    expect(pointer).toMatchObject({ pointerType: 'touch', clientX: 30, clientY: 40 });
    expect(target).toEqual({ type: 'event', event: EVENT });
    expect(immediate).toBe(true);
    expect(h.container.classList.contains('touch-drag-mode')).toBe(true);
    expect(h.content.classList.contains('scroll-blocked')).toBe(true);
    const eventBox = h.event.closest('.scheduler-event')!;
    expect(eventBox.classList.contains('touch-hold-active')).toBe(true);
    expect(eventBox.classList.contains('touch-hold-pending')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.touchAction).toBe('none');
  });

  it('honours a configured hold duration', () => {
    h = setup({ touchHoldDuration: 200 });
    touch('touchstart', h.slot);
    vi.advanceTimersByTime(200);
    expect(h.callbacks.onPointerDown).toHaveBeenCalledTimes(1);
  });

  it('once armed, moves feed the drag and cannot scroll the page', () => {
    h = setup();
    touch('touchstart', h.slot);
    vi.advanceTimersByTime(600);
    const ev = touch('touchmove', h.slot, 80, 90);
    expect(ev.defaultPrevented).toBe(true);
    expect(h.callbacks.onPointerMove).toHaveBeenCalled();
    expect(h.callbacks.onPointerMove.mock.calls.at(-1)![0]).toMatchObject({ clientX: 80, clientY: 90 });
  });

  it('lifting the finger ends an armed drag and restores the page', () => {
    h = setup();
    document.body.style.overflow = 'scroll';
    touch('touchstart', h.slot);
    vi.advanceTimersByTime(600);
    touch('touchend', h.slot, 50, 60);

    expect(h.callbacks.onPointerUp).toHaveBeenCalledTimes(1);
    expect(h.callbacks.onPointerUp.mock.calls[0][0]).toMatchObject({ clientX: 50, clientY: 60 });
    expect(h.callbacks.onTouchDragDeactivated).toHaveBeenCalledTimes(1);
    expect(h.handler.isInTouchDragMode()).toBe(false);
    expect(h.container.classList.contains('touch-drag-mode')).toBe(false);
    expect(h.content.classList.contains('scroll-blocked')).toBe(false);
    expect(h.root.querySelector('.touch-hold-active, .touch-hold-pending')).toBeNull();
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.touchAction).toBe('');
  });

  it('small jitter during the hold keeps it alive and blocks the scroll it would start', () => {
    h = setup();
    touch('touchstart', h.slot, 10, 10);
    const ev = touch('touchmove', h.slot, 16, 16);
    expect(ev.defaultPrevented).toBe(true);
    vi.advanceTimersByTime(600);
    expect(h.callbacks.onPointerDown).toHaveBeenCalledTimes(1);
  });

  it('moving past the threshold on a slot hands the gesture back to native scroll', () => {
    h = setup();
    touch('touchstart', h.slot, 10, 10);
    const ev = touch('touchmove', h.slot, 10, 40);
    expect(ev.defaultPrevented).toBe(false);
    expect(h.slot.classList.contains('touch-hold-pending')).toBe(false);
    vi.advanceTimersByTime(1000);
    touch('touchend', h.slot, 10, 40);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
    expect(h.callbacks.onClick).not.toHaveBeenCalled();
  });

  it('honours a configured move threshold', () => {
    h = setup({ touchMoveThreshold: 50 });
    touch('touchstart', h.slot, 10, 10);
    expect(touch('touchmove', h.slot, 10, 40).defaultPrevented).toBe(true);
    vi.advanceTimersByTime(600);
    expect(h.callbacks.onPointerDown).toHaveBeenCalledTimes(1);
  });

  it('a second finger cancels the hold', () => {
    h = setup();
    touch('touchstart', h.slot);
    touch('touchstart', h.slot, 10, 10, 2);
    vi.advanceTimersByTime(1000);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
  });

  it('a second finger joining a move cancels the hold', () => {
    h = setup();
    touch('touchstart', h.slot);
    touch('touchmove', h.slot, 10, 10, 2);
    vi.advanceTimersByTime(1000);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
  });

  it('a touch outside every target, or on a slot without selection, starts nothing', () => {
    h = setup();
    touch('touchstart', h.outside);
    h.flags.selectable = false;
    touch('touchstart', h.slot);
    vi.advanceTimersByTime(1000);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
  });

  it('a read-only scheduler starts no touch gesture', () => {
    h = setup();
    h.flags.editable = false;
    touch('touchstart', h.event);
    vi.advanceTimersByTime(1000);
    touch('touchend', h.event);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
    expect(h.callbacks.onClick).not.toHaveBeenCalled();
  });

  it('a touch on the selected event resize handle arms at once, with no hold', () => {
    h = setup();
    h.flags.selectedId = 'e1';
    touch('touchstart', h.handle);
    expect(h.callbacks.onPointerDown).toHaveBeenCalledTimes(1);
    expect(h.callbacks.onPointerDown.mock.calls[0][1]).toMatchObject({ type: 'resize-handle', resizeHandle: 'end' });
    expect(h.callbacks.onPointerDown.mock.calls[0][2]).toBe(true);
  });

  it('a touch on an unselected event resize handle still waits for the hold', () => {
    h = setup();
    touch('touchstart', h.handle);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(h.callbacks.onPointerDown).toHaveBeenCalledTimes(1);
  });

  it('arming buzzes once where the vibration API exists', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    try {
      h = setup();
      touch('touchstart', h.slot);
      vi.advanceTimersByTime(600);
      expect(vibrate).toHaveBeenCalledWith(10);
    } finally {
      delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    }
  });

  it('a vibration API that throws does not stop the drag from arming', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: () => {
        throw new Error('not allowed');
      },
      configurable: true,
    });
    try {
      h = setup();
      touch('touchstart', h.slot);
      vi.advanceTimersByTime(600);
      expect(h.callbacks.onPointerDown).toHaveBeenCalledTimes(1);
    } finally {
      delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    }
  });
});

describe('InputHandler — touch pan', () => {
  it('moving past the threshold on an event pans the scroller by the finger delta', () => {
    h = setup();
    h.content.scrollLeft = 100;
    h.content.scrollTop = 200;
    touch('touchstart', h.event, 50, 50);
    const start = touch('touchmove', h.event, 50, 80);
    expect(start.defaultPrevented).toBe(true);
    expect(h.content.classList.contains('pan-mode')).toBe(true);

    const pan = touch('touchmove', h.event, 20, 30);
    expect(pan.defaultPrevented).toBe(true);
    expect(h.content.scrollLeft).toBe(130);
    expect(h.content.scrollTop).toBe(250);

    touch('touchend', h.event, 20, 30);
    expect(h.content.classList.contains('pan-mode')).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
    expect(h.callbacks.onClick).not.toHaveBeenCalled();
  });

  it('without a scroll container there is nothing to pan, and the page may scroll', () => {
    h = setup();
    h.callbacks.getScrollContainer.mockReturnValue(null);
    touch('touchstart', h.event, 50, 50);
    touch('touchmove', h.event, 50, 80);
    const next = touch('touchmove', h.event, 50, 120);
    expect(next.defaultPrevented).toBe(false);
  });

  it('a second finger ends the pan', () => {
    h = setup();
    touch('touchstart', h.event, 50, 50);
    touch('touchmove', h.event, 50, 80);
    touch('touchmove', h.event, 50, 80, 2);
    expect(h.content.classList.contains('pan-mode')).toBe(false);
  });
});

describe('InputHandler — touch cancel', () => {
  it('the platform cancelling an armed drag abandons it instead of committing it', () => {
    h = setup();
    touch('touchstart', h.slot);
    vi.advanceTimersByTime(600);
    touch('touchcancel', h.slot);
    expect(h.callbacks.onPointerCancel).toHaveBeenCalledTimes(1);
    expect(h.callbacks.onPointerUp).not.toHaveBeenCalled();
    expect(h.callbacks.onTouchDragDeactivated).toHaveBeenCalledTimes(1);
    expect(h.handler.isInTouchDragMode()).toBe(false);
  });

  it('a cancel during the hold drops it without a click or a drag', () => {
    h = setup();
    touch('touchstart', h.slot);
    touch('touchcancel', h.slot);
    vi.advanceTimersByTime(1000);
    expect(h.callbacks.onPointerDown).not.toHaveBeenCalled();
    expect(h.callbacks.onClick).not.toHaveBeenCalled();
    expect(h.callbacks.onPointerCancel).not.toHaveBeenCalled();
  });

  it('a cancel ends a pan', () => {
    h = setup();
    touch('touchstart', h.event, 50, 50);
    touch('touchmove', h.event, 50, 80);
    touch('touchcancel', h.event);
    expect(h.content.classList.contains('pan-mode')).toBe(false);
  });
});

describe('InputHandler — gesture element listeners', () => {
  it('the rest of a gesture is still heard after a re-render detaches its element', () => {
    h = setup();
    touch('touchstart', h.slotInner);
    // A Lit re-render replaces the node: events stay locked to the detached
    // original and no longer bubble to the shadow root.
    h.slotInner.remove();
    touch('touchend', h.slotInner);
    expect(h.callbacks.onClick).toHaveBeenCalledTimes(1);
  });

  it('a finished gesture releases its element, so a stale node cannot cancel the next hold', () => {
    h = setup();
    const first = h.slotInner;
    touch('touchstart', first);
    touch('touchend', first);
    first.remove();

    touch('touchstart', h.event, 10, 10);
    // A far move arriving on the long-gone element of the finished gesture.
    touch('touchmove', first, 10, 300);
    vi.advanceTimersByTime(600);
    expect(h.callbacks.onPointerDown).toHaveBeenCalledTimes(1);
  });

  it('adds no net listeners to the touched element across repeated taps', () => {
    h = setup();
    const added = vi.spyOn(h.slotInner, 'addEventListener');
    const removed = vi.spyOn(h.slotInner, 'removeEventListener');
    [1, 2, 3].map(() => {
      touch('touchstart', h.slotInner);
      touch('touchend', h.slotInner);
    });
    expect(added).toHaveBeenCalledTimes(9);
    expect(removed).toHaveBeenCalledTimes(9);
  });
});
