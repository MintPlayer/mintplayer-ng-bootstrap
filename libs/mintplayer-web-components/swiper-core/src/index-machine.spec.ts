import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexMachine } from './index-machine';
import { IndexMachineCallbacks, IndexMachineHost, TransitionHandle } from './models';

/**
 * Fake host: records applied ratios and started transitions; transitions
 * complete only when the test says so (or via handle.finish()).
 */
class FakeHost implements IndexMachineHost {
  applied: number[] = [];
  transitions: { from: number; to: number; durationMs: number; onDone: () => void; finished: boolean; cancelled: boolean }[] = [];

  applyOffsetRatio(ratio: number): void {
    this.applied.push(ratio);
  }

  runTransition(from: number, to: number, durationMs: number, onDone: () => void): TransitionHandle {
    const t = { from, to, durationMs, onDone, finished: false, cancelled: false };
    this.transitions.push(t);
    return {
      finish: () => {
        if (t.finished || t.cancelled) return;
        t.finished = true;
        onDone();
      },
      cancel: () => {
        t.cancelled = true;
      },
    };
  }

  get last() {
    return this.transitions[this.transitions.length - 1];
  }

  complete() {
    this.last.finished = true;
    this.last.onDone();
  }
}

describe('IndexMachine', () => {
  let host: FakeHost;
  let callbacks: Required<IndexMachineCallbacks>;

  beforeEach(() => {
    host = new FakeHost();
    callbacks = {
      onIndexChange: vi.fn(),
      onAnimationStart: vi.fn(),
      onAnimationEnd: vi.fn(),
    };
  });

  const make = (config: Partial<Parameters<typeof IndexMachine.prototype.setConfig>[0]> = {}) =>
    new IndexMachine(host, callbacks, { count: 3, ...config });

  it('next() animates to the raw target and commits on completion', () => {
    const m = make();
    m.next();
    expect(callbacks.onAnimationStart).toHaveBeenCalledTimes(1);
    expect(host.last).toMatchObject({ from: 0, to: 1, durationMs: 500 });
    expect(m.getIndex()).toBe(0); // not yet committed
    host.complete();
    expect(m.getIndex()).toBe(1);
    expect(callbacks.onIndexChange).toHaveBeenCalledWith(1);
    expect(callbacks.onAnimationEnd).toHaveBeenCalledTimes(1);
    expect(host.applied.at(-1)).toBe(1); // snapped to rest after the transition
  });

  it('wrapping next from the last slide animates THROUGH the wrap cell (visual target = count)', () => {
    const m = make();
    m.goto(2, { animate: false });
    m.next();
    expect(host.last).toMatchObject({ from: 2, to: 3 });
    host.complete();
    expect(m.getIndex()).toBe(0);
    expect(host.applied.at(-1)).toBe(0);
  });

  it('wrapping previous from slide 0 animates through -1', () => {
    const m = make();
    m.previous();
    expect(host.last).toMatchObject({ from: 0, to: -1 });
    host.complete();
    expect(m.getIndex()).toBe(2);
  });

  it('wrap=false: next at the last slide is a silent no-op for EVERY input path', () => {
    const m = make({ wrap: false });
    m.goto(2, { animate: false });
    callbacks.onIndexChange.mockClear();

    m.next();
    expect(host.transitions).toHaveLength(0);

    m.intent('next'); // keyboard path resolves through the same rule
    expect(host.transitions).toHaveLength(0);

    // drag past the edge: the live drag hard-stopped at the edge, so the
    // release settles instantly at the same slide — no wrap, no index change
    m.beginDrag();
    m.dragBy(-120, 300);
    expect(host.applied.at(-1)).toBe(2); // hard stop held the track at the edge
    m.endDrag(-120, 300);
    expect(host.transitions).toHaveLength(0);
    expect(m.getIndex()).toBe(2);
    expect(host.applied.at(-1)).toBe(2);
    expect(callbacks.onIndexChange).not.toHaveBeenCalled();
  });

  it('goto out of range is a no-op; goto(i, {animate:false}) jumps and only emits onIndexChange', () => {
    const m = make();
    m.goto(7);
    m.goto(-1);
    expect(host.transitions).toHaveLength(0);

    m.goto(2, { animate: false });
    expect(m.getIndex()).toBe(2);
    expect(host.applied.at(-1)).toBe(2);
    expect(callbacks.onIndexChange).toHaveBeenCalledWith(2);
    expect(callbacks.onAnimationStart).not.toHaveBeenCalled();
    expect(callbacks.onAnimationEnd).not.toHaveBeenCalled();
  });

  it('drag follows the pointer as index - delta/extent and commits past the px threshold', () => {
    const m = make();
    m.beginDrag();
    m.dragBy(-150, 300); // half a slide leftwards
    expect(host.applied.at(-1)).toBe(0.5);
    m.endDrag(-150, 300); // ≥ 50px default threshold → next
    expect(host.last).toMatchObject({ from: 0.5, to: 1 });
    host.complete();
    expect(m.getIndex()).toBe(1);
  });

  it('a short drag snaps back without an index change', () => {
    const m = make();
    m.beginDrag();
    m.dragBy(-20, 300);
    m.endDrag(-20, 300); // < 50px
    expect(host.last).toMatchObject({ to: 0 });
    host.complete();
    expect(m.getIndex()).toBe(0);
    expect(callbacks.onIndexChange).not.toHaveBeenCalled();
  });

  it('wrap=false: the live drag hard-stops at the deck edges', () => {
    const m = make({ wrap: false });
    m.beginDrag();
    m.dragBy(200, 300); // dragging backwards past slide 0
    expect(host.applied.at(-1)).toBe(0);
  });

  it('starting a navigation finishes an in-flight transition first (interrupt = finish, commit)', () => {
    const m = make();
    m.next();
    const first = host.last;
    m.next(); // interrupts
    expect(first.finished).toBe(true);
    expect(m.getIndex()).toBe(1); // first transition committed by finish()
    expect(host.last).toMatchObject({ from: 1, to: 2 });
  });

  it('beginDrag() interrupts an in-flight transition so the finger owns the track', () => {
    const m = make();
    m.next();
    m.beginDrag();
    expect(host.transitions[0].finished).toBe(true);
    expect(m.getIndex()).toBe(1);
  });

  it('reduced motion collapses transitions to an instant move (start + end still fire)', () => {
    const m = make({ prefersReducedMotion: () => true });
    m.next();
    expect(host.transitions).toHaveLength(0);
    expect(m.getIndex()).toBe(1);
    expect(callbacks.onAnimationStart).toHaveBeenCalledTimes(1);
    expect(callbacks.onAnimationEnd).toHaveBeenCalledTimes(1);
  });

  it('durationMs is configurable and forwarded to the host', () => {
    const m = make({ durationMs: 250 });
    m.next();
    expect(host.last.durationMs).toBe(250);
  });

  it('intent() maps first/last onto goto', () => {
    const m = make();
    m.intent('last');
    expect(host.last.to).toBe(2);
    host.complete();
    m.intent('first');
    expect(host.last.to).toBe(0);
    host.complete();
    expect(m.getIndex()).toBe(0);
  });

  it('shrinking count below the current index lands on the new last slide', () => {
    const m = make();
    m.goto(2, { animate: false });
    m.setConfig({ count: 2 });
    expect(m.getIndex()).toBe(1);
    expect(callbacks.onIndexChange).toHaveBeenLastCalledWith(1);
    expect(host.applied.at(-1)).toBe(1);
  });

  it('count 0 makes every navigation a no-op', () => {
    const m = make({ count: 0 });
    m.next();
    m.previous();
    m.intent('last');
    expect(host.transitions).toHaveLength(0);
    expect(callbacks.onIndexChange).not.toHaveBeenCalled();
  });

  it('destroy() cancels an in-flight transition without committing', () => {
    const m = make();
    m.next();
    m.destroy();
    expect(host.transitions[0].cancelled).toBe(true);
    expect(m.getIndex()).toBe(0);
    expect(callbacks.onAnimationEnd).toHaveBeenCalledTimes(0);
  });
});
