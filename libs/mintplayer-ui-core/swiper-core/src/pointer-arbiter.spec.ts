import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PointerArbiter } from './pointer-arbiter';
import { PointerArbiterCallbacks } from './models';

describe('PointerArbiter', () => {
  let callbacks: Required<PointerArbiterCallbacks>;

  beforeEach(() => {
    vi.useFakeTimers();
    callbacks = {
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onDragEnd: vi.fn(),
      onTap: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const make = (orientation: 'horizontal' | 'vertical' = 'horizontal') =>
    new PointerArbiter({ orientation }, callbacks);

  it('locks after >3px primary movement and keeps preventing for the rest of the stroke', () => {
    const a = make();
    a.pointerDown(100, 100);
    expect(a.pointerMove(102, 100)).toBe(false); // 2px — below threshold
    expect(a.pointerMove(105, 100)).toBe(true);  // 5px — locked
    expect(a.pointerMove(104, 100)).toBe(true);  // stays locked below threshold
    expect(a.pointerUp()).toBe(false);           // tap window: no preventDefault on up
  });

  it('does not lock when the perpendicular axis dominates (page scroll stays native)', () => {
    const a = make();
    a.pointerDown(100, 100);
    expect(a.pointerMove(104, 110)).toBe(false); // dy 10 > dx 4
    expect(a.pointerMove(105, 120)).toBe(false);
    a.pointerUp();
    expect(callbacks.onDragEnd).not.toHaveBeenCalled();
  });

  it('vertical orientation locks on dy and reports the y delta', () => {
    const a = make('vertical');
    a.pointerDown(50, 200);
    vi.advanceTimersByTime(20);
    expect(callbacks.onDragStart).toHaveBeenCalledTimes(1);
    expect(a.pointerMove(50, 190)).toBe(true);
    a.pointerUp();
    expect(callbacks.onDragEnd).toHaveBeenCalledWith(-10);
  });

  it('a release inside the start window is a tap: no drag events, no preventDefault', () => {
    const a = make();
    a.pointerDown(10, 10);
    vi.advanceTimersByTime(10); // < 20ms
    expect(a.pointerUp()).toBe(false);
    expect(callbacks.onTap).toHaveBeenCalledTimes(1);
    expect(callbacks.onDragStart).not.toHaveBeenCalled();
    expect(callbacks.onDragEnd).not.toHaveBeenCalled();
  });

  it('a settled press emits onDragStart then live onDragMove deltas then onDragEnd', () => {
    const a = make();
    a.pointerDown(100, 100);
    vi.advanceTimersByTime(20);
    expect(callbacks.onDragStart).toHaveBeenCalledTimes(1);
    a.pointerMove(70, 102);
    expect(callbacks.onDragMove).toHaveBeenLastCalledWith(-30);
    a.pointerMove(60, 103);
    expect(callbacks.onDragMove).toHaveBeenLastCalledWith(-40);
    a.pointerUp();
    expect(callbacks.onDragEnd).toHaveBeenCalledWith(-40);
    expect(callbacks.onTap).not.toHaveBeenCalled();
  });

  it('moves before the start delay still arm the direction lock (preventDefault during the gap)', () => {
    const a = make();
    a.pointerDown(100, 100);
    // No timer advance: startTouch not yet committed, but the shadow origin is.
    expect(a.pointerMove(110, 100)).toBe(true);
  });

  it('abort() drops the gesture without emitting', () => {
    const a = make();
    a.pointerDown(0, 0);
    vi.advanceTimersByTime(20);
    a.pointerMove(-50, 0);
    a.abort();
    expect(a.pointerUp()).toBe(false);
    expect(callbacks.onDragEnd).not.toHaveBeenCalled();
    expect(callbacks.onTap).not.toHaveBeenCalled();
  });

  it('destroy() silences a pending start timer', () => {
    const a = make();
    a.pointerDown(0, 0);
    a.destroy();
    vi.advanceTimersByTime(50);
    expect(callbacks.onDragStart).not.toHaveBeenCalled();
  });

  it('touchAction reflects orientation', () => {
    expect(make('horizontal').touchAction).toBe('pan-y');
    expect(make('vertical').touchAction).toBe('pan-x');
  });
});
