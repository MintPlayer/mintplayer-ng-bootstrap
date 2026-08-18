import { afterEach, describe, expect, it, vi } from 'vitest';

import { InputHandler } from './input-handler';
import { normalizePointerEvent } from './pointer-event';

/**
 * The splitter's input layer: it turns mouse, touch and keyboard into one set
 * of callbacks and owns nothing else. Two behaviours here are the ones that
 * cause real bugs.
 *
 * **Move and end listen on the document, not on the divider.** A pointer
 * moving faster than the layout leaves the 4px divider immediately, so a
 * handler bound to the divider drops the drag the moment it starts working.
 *
 * **Those document listeners must come off again.** Every drag that leaves one
 * behind adds a permanent handler that fires for the rest of the page's life.
 */

const handlers: InputHandler[] = [];

function makeHandler(callbacks: Partial<Parameters<typeof createFor>[0]> = {}) {
  return createFor({
    onResizeStart: vi.fn(),
    onResizeMove: vi.fn(),
    onResizeEnd: vi.fn(),
    ...callbacks,
  });
}

function createFor(callbacks: {
  onResizeStart: ReturnType<typeof vi.fn>;
  onResizeMove: ReturnType<typeof vi.fn>;
  onResizeEnd: ReturnType<typeof vi.fn>;
  onResizeKey?: ReturnType<typeof vi.fn>;
}) {
  const handler = new InputHandler(callbacks as never);
  handlers.push(handler);
  const divider = document.createElement('div');
  document.body.appendChild(divider);
  handler.attachDividerListeners(divider, 1);
  return { handler, divider, callbacks };
}

function mouse(type: string, clientX = 0, clientY = 0): MouseEvent {
  return new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
}

function touch(type: string, clientX = 0, clientY = 0): TouchEvent {
  const point = { clientX, clientY } as Touch;
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [point] });
  Object.defineProperty(event, 'changedTouches', { value: [point] });
  return event;
}

afterEach(() => {
  while (handlers.length) handlers.pop()!.dispose();
  document.body.innerHTML = '';
});

describe('InputHandler — a mouse drag', () => {
  it('reports the start with the divider it began on', () => {
    const { divider, callbacks } = makeHandler();

    divider.dispatchEvent(mouse('mousedown', 10, 20));

    expect(callbacks.onResizeStart).toHaveBeenCalledTimes(1);
    const [event, index, element] = callbacks.onResizeStart.mock.calls[0];
    expect(event.point).toEqual({ x: 10, y: 20 });
    expect(index).toBe(1);
    expect(element).toBe(divider);
  });

  it('claims mousedown so the browser does not start a text selection', () => {
    const { divider } = makeHandler();
    const event = mouse('mousedown');
    divider.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('becomes active for the duration of the drag', () => {
    const { handler, divider } = makeHandler();
    expect(handler.getIsActive()).toBe(false);

    divider.dispatchEvent(mouse('mousedown'));
    expect(handler.getIsActive()).toBe(true);

    document.dispatchEvent(mouse('mouseup'));
    expect(handler.getIsActive()).toBe(false);
  });

  // The pointer leaves a 4px divider on the first fast move, so tracking has
  // to happen on the document or the drag dies immediately.
  it('tracks movement anywhere in the document, not only over the divider', () => {
    const { divider, callbacks } = makeHandler();
    divider.dispatchEvent(mouse('mousedown'));

    document.dispatchEvent(mouse('mousemove', 500, 500));

    expect(callbacks.onResizeMove).toHaveBeenCalledTimes(1);
    expect(callbacks.onResizeMove.mock.calls[0][0].point).toEqual({ x: 500, y: 500 });
  });

  it('ends anywhere in the document too', () => {
    const { divider, callbacks } = makeHandler();
    divider.dispatchEvent(mouse('mousedown'));

    document.dispatchEvent(mouse('mouseup', 300, 300));

    expect(callbacks.onResizeEnd).toHaveBeenCalledTimes(1);
  });

  // Every drag that leaks a document listener leaves a handler firing for the
  // rest of the page's life.
  it('stops tracking once the drag ends', () => {
    const { divider, callbacks } = makeHandler();
    divider.dispatchEvent(mouse('mousedown'));
    document.dispatchEvent(mouse('mouseup'));
    callbacks.onResizeMove.mockClear();

    document.dispatchEvent(mouse('mousemove', 10, 10));

    expect(callbacks.onResizeMove).not.toHaveBeenCalled();
  });

  it('ignores a stray mouseup with no drag in progress', () => {
    const { callbacks } = makeHandler();
    document.dispatchEvent(mouse('mouseup'));
    expect(callbacks.onResizeEnd).not.toHaveBeenCalled();
  });

  it('reports several moves in order', () => {
    const { divider, callbacks } = makeHandler();
    divider.dispatchEvent(mouse('mousedown'));

    document.dispatchEvent(mouse('mousemove', 10, 0));
    document.dispatchEvent(mouse('mousemove', 20, 0));

    expect(callbacks.onResizeMove.mock.calls.map((c) => c[0].clientX)).toEqual([10, 20]);
  });
});

describe('InputHandler — a touch drag', () => {
  it('starts from the first touch point', () => {
    const { divider, callbacks } = makeHandler();

    divider.dispatchEvent(touch('touchstart', 40, 50));

    expect(callbacks.onResizeStart.mock.calls[0][0].point).toEqual({ x: 40, y: 50 });
    expect(callbacks.onResizeStart.mock.calls[0][0].isTouch).toBe(true);
  });

  // Non-passive on purpose: without preventDefault the browser scrolls the
  // page instead of resizing the panel.
  it('claims touchstart so the page does not scroll instead', () => {
    const { divider } = makeHandler();
    const event = touch('touchstart');
    divider.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('tracks touchmove on the document', () => {
    const { divider, callbacks } = makeHandler();
    divider.dispatchEvent(touch('touchstart'));

    document.dispatchEvent(touch('touchmove', 60, 70));

    expect(callbacks.onResizeMove.mock.calls[0][0].point).toEqual({ x: 60, y: 70 });
  });

  it('ends on touchend', () => {
    const { divider, callbacks } = makeHandler();
    divider.dispatchEvent(touch('touchstart'));

    document.dispatchEvent(touch('touchend', 60, 70));

    expect(callbacks.onResizeEnd).toHaveBeenCalledTimes(1);
  });

  // A cancelled touch (a call arrives, the gesture is stolen) has to end the
  // drag, or the splitter is left stuck mid-resize.
  it('ends on touchcancel as well', () => {
    const { divider, callbacks } = makeHandler();
    divider.dispatchEvent(touch('touchstart'));

    document.dispatchEvent(touch('touchcancel', 60, 70));

    expect(callbacks.onResizeEnd).toHaveBeenCalledTimes(1);
  });

  it('stops tracking after a touch drag ends', () => {
    const { divider, callbacks } = makeHandler();
    divider.dispatchEvent(touch('touchstart'));
    document.dispatchEvent(touch('touchend'));
    callbacks.onResizeMove.mockClear();

    document.dispatchEvent(touch('touchmove', 1, 1));

    expect(callbacks.onResizeMove).not.toHaveBeenCalled();
  });
});

describe('InputHandler — the keyboard', () => {
  const key = (k: string, shiftKey = false) =>
    new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true });

  it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'])(
    'reports %s on a focused divider',
    (k) => {
      const onResizeKey = vi.fn();
      const { divider } = makeHandler({ onResizeKey });

      divider.dispatchEvent(key(k));

      expect(onResizeKey).toHaveBeenCalledWith(k, false, 1, divider);
    },
  );

  // Arrow keys scroll the page by default, which would move the view out from
  // under the divider the user is adjusting.
  it('claims a key it acted on', () => {
    const { divider } = makeHandler({ onResizeKey: vi.fn() });
    const event = key('ArrowRight');
    divider.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves a key it does not own to the page', () => {
    const onResizeKey = vi.fn();
    const { divider } = makeHandler({ onResizeKey });
    const event = key('Enter');

    divider.dispatchEvent(event);

    expect(onResizeKey).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  // Shift is the fine-grained modifier, and the input layer only reports that
  // it was held — how much finer is the splitter's decision, not input's.
  it('reports Shift as the fine-granularity flag', () => {
    const onResizeKey = vi.fn();
    const { divider } = makeHandler({ onResizeKey });

    divider.dispatchEvent(key('ArrowLeft', true));

    expect(onResizeKey).toHaveBeenCalledWith('ArrowLeft', true, 1, divider);
  });

  // Keyboard resize is optional; a consumer that does not want it must not get
  // its arrow keys swallowed.
  it('leaves arrow keys alone when no keyboard callback is wired', () => {
    const { divider } = makeHandler();
    const event = key('ArrowLeft');

    divider.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('does not start a pointer drag', () => {
    const { handler, divider } = makeHandler({ onResizeKey: vi.fn() });
    divider.dispatchEvent(key('ArrowRight'));
    expect(handler.getIsActive()).toBe(false);
  });
});

describe('InputHandler — dispose', () => {
  it('detaches listeners left over from a drag still in progress', () => {
    const { handler, divider, callbacks } = makeHandler();
    divider.dispatchEvent(mouse('mousedown'));

    handler.dispose();
    document.dispatchEvent(mouse('mousemove', 5, 5));

    expect(callbacks.onResizeMove).not.toHaveBeenCalled();
    expect(handler.getIsActive()).toBe(false);
  });

  it('is safe to call twice', () => {
    const { handler } = makeHandler();
    handler.dispose();
    expect(() => handler.dispose()).not.toThrow();
  });
});

describe('normalizePointerEvent', () => {
  it('reads a mouse event straight through', () => {
    const normalized = normalizePointerEvent(mouse('mousemove', 12, 34));
    expect(normalized).toMatchObject({ clientX: 12, clientY: 34, isTouch: false });
    expect(normalized.point).toEqual({ x: 12, y: 34 });
  });

  it('reads the active touch point', () => {
    const normalized = normalizePointerEvent(touch('touchmove', 5, 6));
    expect(normalized).toMatchObject({ clientX: 5, clientY: 6, isTouch: true });
  });

  // `touches` is empty on touchend — the point that just lifted is only in
  // `changedTouches`, and reading the wrong list gives `undefined` coordinates.
  it('falls back to changedTouches when the finger has already lifted', () => {
    expect(normalizePointerEvent(touch('touchend', 7, 8))).toMatchObject({
      clientX: 7,
      clientY: 8,
    });
  });

  it('keeps the original event for the caller', () => {
    const event = mouse('mousemove');
    expect(normalizePointerEvent(event).originalEvent).toBe(event);
  });
});
