import { afterEach, describe, expect, it, vi } from 'vitest';
import { sameWindow, trackScroll, virtualWindow } from './virtual-window';

describe('trackScroll', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFrames() {
    const frames = new Map<number, FrameRequestCallback>();
    let next = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => (frames.set(++next, cb), next));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    return () => [...frames.values()].splice(0).map((cb) => (frames.clear(), cb(0)));
  }

  function scroller() {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', { value: 300 });
    el.scrollTop = 40;
    return el;
  }

  it('reports once per frame, on start, scroll and resize', () => {
    const flush = stubFrames();
    const observers: { cb: () => void; disconnect: ReturnType<typeof vi.fn> }[] = [];
    vi.stubGlobal('ResizeObserver', class {
      disconnect = vi.fn();
      constructor(public cb: () => void) { observers.push(this); }
      observe() { /* measured by the stub */ }
    });
    const el = scroller();
    const report = vi.fn();
    const stop = trackScroll(el, report);
    el.dispatchEvent(new Event('scroll'));
    flush();
    expect(report.mock.calls).toEqual([[40, 300]]);
    observers[0].cb();
    flush();
    expect(report).toHaveBeenCalledTimes(2);
    stop();
    expect(observers[0].disconnect).toHaveBeenCalled();
    el.dispatchEvent(new Event('scroll'));
    flush();
    expect(report).toHaveBeenCalledTimes(2);
  });

  it('works without ResizeObserver', () => {
    const flush = stubFrames();
    vi.stubGlobal('ResizeObserver', undefined);
    const report = vi.fn();
    const stop = trackScroll(scroller(), report);
    flush();
    expect(report).toHaveBeenCalledOnce();
    stop();
  });
});

describe('virtualWindow', () => {
  it('renders the viewport plus a buffer on each side', () => {
    expect(virtualWindow({ scrollTop: 1000, viewport: 200, itemSize: 20, total: 1000, buffer: 5 })).toEqual({
      start: 45,
      end: 65,
      before: 900,
      after: 18700,
    });
  });

  it('clamps at the top and the bottom', () => {
    expect(virtualWindow({ scrollTop: 0, viewport: 100, itemSize: 20, total: 3 })).toEqual({ start: 0, end: 3, before: 0, after: 0 });
    const bottom = virtualWindow({ scrollTop: 99999, viewport: 100, itemSize: 20, total: 50 });
    expect(bottom.end).toBe(50);
    expect(bottom.after).toBe(0);
  });

  it('survives an empty list and a zero item size', () => {
    expect(virtualWindow({ scrollTop: 0, viewport: 100, itemSize: 0, total: 0 })).toEqual({ start: 0, end: 0, before: 0, after: 0 });
  });

  it('compares windows by value', () => {
    const w = virtualWindow({ scrollTop: 0, viewport: 100, itemSize: 20, total: 10 });
    expect(sameWindow(w, { ...w })).toBe(true);
    expect(sameWindow(w, { ...w, end: 1 })).toBe(false);
  });
});
