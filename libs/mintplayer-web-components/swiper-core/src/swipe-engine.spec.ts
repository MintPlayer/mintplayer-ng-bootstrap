import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SwipeEngine } from './swipe-engine';
import {
  SwipeAnimationHandle,
  SwipeAnimationSpec,
  SwipeEngineHost,
  SwipeSlideState,
  SwipeTrackOffset,
} from './models';

function slides(count: number, height = 100): SwipeSlideState[] {
  return Array.from({ length: count }, () => ({ offside: false, height }));
}

/** Test host that records offsets and lets specs drive the animation clock. */
function makeHost(containerLength = 300) {
  const offsets: SwipeTrackOffset[] = [];
  let pendingDone: (() => void) | null = null;
  const host: SwipeEngineHost = {
    applyTrackOffset: (o) => offsets.push(o),
    getContainerLength: () => containerLength,
    runAnimation: (_spec: SwipeAnimationSpec, onDone): SwipeAnimationHandle => {
      pendingDone = onDone;
      return {
        finish: () => { const d = pendingDone; pendingDone = null; d?.(); },
        cancel: () => { pendingDone = null; },
      };
    },
  };
  return {
    host,
    offsets,
    lastOffset: () => offsets[offsets.length - 1],
    completeAnimation: () => { const d = pendingDone; pendingDone = null; d?.(); },
    isAnimating: () => pendingDone !== null,
  };
}

describe('SwipeEngine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts at index 0', () => {
    const { host } = makeHost();
    const engine = new SwipeEngine(host);
    expect(engine.getIndex()).toBe(0);
  });

  it('setIndex updates the index and notifies once', () => {
    const onIndexChange = vi.fn();
    const { host } = makeHost();
    const engine = new SwipeEngine(host, { onIndexChange });
    engine.setSlides(slides(3));
    engine.setIndex(2);
    expect(engine.getIndex()).toBe(2);
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(2);
    engine.setIndex(2); // no-op
    expect(onIndexChange).toHaveBeenCalledTimes(1);
  });

  describe('navigation (slide mode)', () => {
    it('next advances after the 20ms goto delay and animation completion', () => {
      const onIndexChange = vi.fn();
      const h = makeHost();
      const engine = new SwipeEngine(h.host, { onIndexChange });
      engine.setSlides(slides(3));
      engine.markReady();

      engine.next();
      expect(engine.getIndex()).toBe(0); // not yet — waits for the goto timer
      vi.advanceTimersByTime(20);
      expect(h.isAnimating()).toBe(true);
      h.completeAnimation();
      expect(engine.getIndex()).toBe(1);
      expect(onIndexChange).toHaveBeenLastCalledWith(1);
    });

    it('wraps forward past the last slide to 0', () => {
      const h = makeHost();
      const engine = new SwipeEngine(h.host);
      engine.setSlides(slides(3));
      engine.setIndex(2);
      engine.next();
      vi.advanceTimersByTime(20);
      h.completeAnimation();
      expect(engine.getIndex()).toBe(0);
    });

    it('wraps backward before the first slide to the last', () => {
      const h = makeHost();
      const engine = new SwipeEngine(h.host);
      engine.setSlides(slides(3));
      engine.previous();
      vi.advanceTimersByTime(20);
      h.completeAnimation();
      expect(engine.getIndex()).toBe(2);
    });
  });

  describe('keyboard', () => {
    it('consumes orientation-matching arrows and Home/End', () => {
      const h = makeHost();
      const engine = new SwipeEngine(h.host, {}, { animation: 'none' });
      engine.setSlides(slides(4));
      expect(engine.onKeyPress('ArrowRight')).toBe(true);
      vi.advanceTimersByTime(20);
      expect(engine.getIndex()).toBe(1);
      expect(engine.onKeyPress('End')).toBe(true);
      vi.advanceTimersByTime(20);
      expect(engine.getIndex()).toBe(3);
      expect(engine.onKeyPress('Home')).toBe(true);
      vi.advanceTimersByTime(20);
      expect(engine.getIndex()).toBe(0);
    });

    it('ignores cross-axis arrows (lets the page scroll)', () => {
      const h = makeHost();
      const engine = new SwipeEngine(h.host, {}, { orientation: 'horizontal' });
      expect(engine.onKeyPress('ArrowUp')).toBe(false);
      expect(engine.onKeyPress('ArrowDown')).toBe(false);
    });

    it('does nothing when keyboardEvents is disabled', () => {
      const h = makeHost();
      const engine = new SwipeEngine(h.host, {}, { keyboardEvents: false });
      expect(engine.onKeyPress('ArrowRight')).toBe(false);
      expect(engine.onKeyPress('Home')).toBe(false);
    });
  });

  describe('pointer gestures + direction lock', () => {
    it('locks onto the primary axis only past the 3px threshold and when it dominates', () => {
      const h = makeHost();
      const engine = new SwipeEngine(h.host, {}, { orientation: 'horizontal' });
      engine.setSlides(slides(3));
      engine.markReady();
      engine.pointerDown(0, 0);
      vi.advanceTimersByTime(20); // commit startTouch

      expect(engine.pointerMove(2, 0)).toBe(false);   // below threshold
      expect(engine.pointerMove(2, 30)).toBe(false);  // perpendicular dominates
      expect(engine.pointerMove(20, 5)).toBe(true);   // horizontal, dominant, past 3px
      expect(engine.pointerMove(25, 5)).toBe(true);   // stays locked
    });

    it('commits a slide change only when the drag exceeds minimumOffset', () => {
      const h = makeHost();
      const engine = new SwipeEngine(h.host, {}, { animation: 'none', minimumOffset: 50 });
      engine.setSlides(slides(3));
      engine.markReady();

      // small drag — snaps back
      engine.pointerDown(100, 0);
      vi.advanceTimersByTime(20);
      engine.pointerMove(90, 0); // 10px
      engine.pointerUp();
      expect(engine.getIndex()).toBe(0);

      // large leftward drag — advances
      engine.pointerDown(200, 0);
      vi.advanceTimersByTime(20);
      engine.pointerMove(100, 0); // -100px
      engine.pointerUp();
      expect(engine.getIndex()).toBe(1);
    });

    it('treats a release before the start delay as a tap (no change)', () => {
      const onIndexChange = vi.fn();
      const h = makeHost();
      const engine = new SwipeEngine(h.host, { onIndexChange }, { animation: 'none' });
      engine.setSlides(slides(3));
      engine.pointerDown(0, 0);
      expect(engine.pointerUp()).toBe(false); // released within 20ms
      vi.advanceTimersByTime(20);
      expect(engine.getIndex()).toBe(0);
      expect(onIndexChange).not.toHaveBeenCalled();
    });
  });

  describe('offsets', () => {
    it('drives horizontal margin-left as a percentage of slide width', () => {
      const h = makeHost();
      const engine = new SwipeEngine(h.host, {}, { orientation: 'horizontal', animation: 'none' });
      engine.setSlides(slides(3));
      engine.markReady();
      expect(h.lastOffset().marginLeftPercent).toBeCloseTo(0);

      engine.onKeyPress('ArrowRight');
      vi.advanceTimersByTime(20);
      expect(engine.getIndex()).toBe(1);
      expect(h.lastOffset().marginLeftPercent).toBe(-100);
    });

    it('emits no margins in fade mode (CSS positions slides)', () => {
      const h = makeHost();
      const engine = new SwipeEngine(h.host, {}, { animation: 'fade' });
      engine.setSlides(slides(3));
      engine.markReady();
      const o = h.lastOffset();
      expect(o.marginLeftPercent).toBeNull();
      expect(o.marginRightPercent).toBeNull();
      expect(o.marginTopPx).toBeNull();
      expect(o.marginBottomPx).toBeNull();
    });
  });

  it('accounts for offside clones when computing left padding', () => {
    // [clone, real, real, real, clone] — slide-mode carousel layout
    const h = makeHost();
    const engine = new SwipeEngine(h.host, {}, { orientation: 'horizontal', animation: 'none' });
    engine.setSlides([
      { offside: true, height: 100 },
      ...slides(3),
      { offside: true, height: 100 },
    ]);
    engine.markReady();
    // padLeft = 1 → at index 0 the track shifts one clone-width left.
    expect(h.lastOffset().marginLeftPercent).toBe(-100);
    engine.next();
    vi.advanceTimersByTime(20);
    expect(engine.getIndex()).toBe(1);
  });

  it('cancels the in-flight animation on destroy without committing', () => {
    const onIndexChange = vi.fn();
    const h = makeHost();
    const engine = new SwipeEngine(h.host, { onIndexChange });
    engine.setSlides(slides(3));
    engine.markReady();
    engine.next();
    vi.advanceTimersByTime(20);
    expect(h.isAnimating()).toBe(true);
    engine.destroy();
    expect(h.isAnimating()).toBe(false);
    expect(engine.getIndex()).toBe(0);
  });
});
