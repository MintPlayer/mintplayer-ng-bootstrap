import type { AnchorBox } from './placement';

export type OpenSide = 'below' | 'above';

/**
 * Which side of its anchor an anchored panel opens on: `below` unless the panel
 * does not fit there AND has more room above. Pure, so a core can hold the
 * answer in its snapshot and every front renders the same `data-side`; the
 * front only measures. A panel that fits on neither side stays below (its own
 * `max-height` + scroll handle the overflow), so the answer never flickers
 * between two equally bad sides.
 */
export function openSide(
  anchor: Pick<AnchorBox, 'top' | 'bottom'>,
  panelHeight: number,
  viewportHeight: number,
  margin = 8,
): OpenSide {
  const below = viewportHeight - anchor.bottom - margin;
  const above = anchor.top - margin;
  return panelHeight > below && above > below ? 'above' : 'below';
}

export interface OpenSideTarget {
  subscribe(listener: (snapshot: { open: boolean }) => void): () => void;
  place(side: OpenSide): void;
}

/**
 * Measures the side every time the target opens, one frame after the open
 * snapshot so the front has rendered the panel first. One copy for every
 * front: each calls it once with node getters and keeps the returned
 * disposer. A browser-only helper; on the server it is never called.
 */
export function trackOpenSide(
  target: OpenSideTarget,
  anchor: () => Element | null | undefined,
  panel: () => HTMLElement | null | undefined,
  margin = 8,
): () => void {
  let wasOpen = false;
  let frame = 0;
  const unsubscribe = target.subscribe(({ open }) => {
    if (open && !wasOpen) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const a = anchor();
        const p = panel();
        if (a && p) target.place(measureOpenSide(a, p, margin));
      });
    }
    wasOpen = open;
  });
  return () => {
    cancelAnimationFrame(frame);
    unsubscribe();
  };
}

/**
 * DOM measurement for {@link openSide}. `scrollHeight` rather than the rect, so a
 * panel still clamped by `max-height`, or not yet laid out on its new side,
 * reports the height it wants, capped at its own `max-height`.
 */
export function measureOpenSide(anchor: Element, panel: HTMLElement, margin = 8): OpenSide {
  const view = anchor.ownerDocument.defaultView;
  if (!view) return 'below';
  const maxHeight = Number.parseFloat(view.getComputedStyle(panel).maxHeight);
  const wanted = Number.isFinite(maxHeight) ? Math.min(panel.scrollHeight, maxHeight) : panel.scrollHeight;
  return openSide(anchor.getBoundingClientRect(), wanted, view.innerHeight, margin);
}
