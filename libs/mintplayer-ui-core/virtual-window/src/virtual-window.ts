export interface WindowInput {
  scrollTop: number;
  /** Height of the scroll viewport, px. */
  viewport: number;
  /** Fixed row height, px. */
  itemSize: number;
  /** Row count. */
  total: number;
  /** Extra rows rendered on each side of the viewport. Default 5. */
  buffer?: number;
}

export interface VirtualWindow {
  /** First rendered index (inclusive). */
  readonly start: number;
  /** Last rendered index (exclusive). */
  readonly end: number;
  /** Spacer height before the first rendered row, px. */
  readonly before: number;
  /** Spacer height after the last rendered row, px. */
  readonly after: number;
}

/**
 * Which rows of a fixed-height list to render for a scroll position. Pure, so
 * a core holds the window in its snapshot and all four fronts render the same
 * slice with two spacers; the front only reports `scrollTop` and the viewport.
 * On the server there is no scroll: pass `scrollTop: 0` and a fallback
 * viewport, and the first page of rows renders as real HTML.
 */
export function virtualWindow(input: WindowInput): VirtualWindow {
  const { scrollTop, viewport, total } = input;
  const itemSize = Math.max(1, input.itemSize);
  const buffer = input.buffer ?? 5;
  const start = Math.min(total, Math.max(0, Math.floor(scrollTop / itemSize) - buffer));
  const end = Math.min(total, start + Math.ceil(viewport / itemSize) + buffer * 2);
  return { start, end, before: start * itemSize, after: (total - end) * itemSize };
}

export function sameWindow(a: VirtualWindow, b: VirtualWindow): boolean {
  return a.start === b.start && a.end === b.end && a.before === b.before && a.after === b.after;
}

/**
 * Browser-only: reports `scrollTop` and `clientHeight` of `scroller` on scroll
 * and on resize, at most once per frame. Returns the disposer.
 */
export function trackScroll(
  scroller: HTMLElement,
  report: (scrollTop: number, viewport: number) => void,
): () => void {
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => report(scroller.scrollTop, scroller.clientHeight));
  };
  scroller.addEventListener('scroll', schedule, { passive: true });
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
  resize?.observe(scroller);
  schedule();
  return () => {
    cancelAnimationFrame(frame);
    scroller.removeEventListener('scroll', schedule);
    resize?.disconnect();
  };
}
