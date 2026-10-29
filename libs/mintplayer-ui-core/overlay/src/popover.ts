import { choosePlacement } from './placement';
import type { OverlayPosition } from './types';

/**
 * Placement for a native `popover` panel (PRD #437 `overlay`). The popover
 * attribute gives the panel the top layer (no clipping by an `overflow`
 * ancestor, no portal moving framework-owned nodes), Escape, light dismiss
 * and nested stacking; what it lacks without CSS anchor positioning is a
 * position next to its anchor. This writes one, as custom properties the
 * group's sheet consumes:
 *
 *   [popover].x { position: fixed; inset: auto; margin: 0;
 *                 left: var(--mp-popover-left); top: var(--mp-popover-top);
 *                 min-width: var(--mp-popover-min-width, auto); }
 *
 * A front never binds these properties, so the core's writes do not fight a
 * template binding.
 */

/** Below the anchor, start-aligned; flipped above, then end-aligned. */
export const DROPDOWN_POSITIONS: readonly OverlayPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 2 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -2 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 2 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -2 },
];

export interface PopoverPlacementOptions {
  positions?: readonly OverlayPosition[];
  /** Kept between the panel and every viewport edge. Default 8. */
  margin?: number;
  /** The panel is at least as wide as its anchor. */
  matchAnchorWidth?: boolean;
}

/** Position `panel` next to `anchor` once, from their current boxes. */
export function placePopover(panel: HTMLElement, anchor: HTMLElement, options: PopoverPlacementOptions = {}): void {
  const view = panel.ownerDocument.defaultView;
  if (!view) return;
  const rect = anchor.getBoundingClientRect();
  if (options.matchAnchorWidth) panel.style.setProperty('--mp-popover-min-width', `${rect.width}px`);
  const size = panel.getBoundingClientRect();
  const rtl = view.getComputedStyle(anchor).direction === 'rtl';
  const chosen = choosePlacement(
    [rect],
    options.positions ?? DROPDOWN_POSITIONS,
    { width: size.width, height: size.height },
    { width: view.innerWidth, height: view.innerHeight, margin: options.margin ?? 8 },
    rtl,
  );
  if (!chosen) return;
  panel.style.setProperty('--mp-popover-left', `${Math.round(chosen.placement.left)}px`);
  panel.style.setProperty('--mp-popover-top', `${Math.round(chosen.placement.top)}px`);
}

/**
 * Keep every popover under `root` next to its anchor while open: placed when
 * it opens, re-placed on scroll (any scroller, captured), on resize, and when
 * the panel itself changes size, batched per frame. The last matters because a
 * core commonly renders a panel's content from the open state the `toggle`
 * sets: measured at `toggle`, the panel is still empty, fits below anything,
 * and would never flip once its content arrives. `anchorFor` names the anchor
 * of a panel, null to leave it alone. `toggle` does not bubble, so it is heard
 * in the capture phase.
 */
export function trackPopovers(
  root: HTMLElement,
  anchorFor: (panel: HTMLElement) => HTMLElement | null,
  options: PopoverPlacementOptions = {},
): () => void {
  const view = root.ownerDocument.defaultView;
  const open = new Set<HTMLElement>();
  let frame = 0;

  const placeAll = () => {
    frame = 0;
    open.forEach((panel) => {
      const anchor = anchorFor(panel);
      if (anchor) placePopover(panel, anchor, options);
    });
  };
  const schedule = () => {
    if (!frame && view) frame = view.requestAnimationFrame(placeAll);
  };
  const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
  const listen = (on: boolean) => {
    const method = on ? 'addEventListener' : 'removeEventListener';
    view?.[method]('scroll', schedule, true);
    view?.[method]('resize', schedule);
  };

  const onToggle = (event: Event) => {
    const panel = event.target as HTMLElement;
    if (!root.contains(panel) || !anchorFor(panel)) return;
    const wasEmpty = open.size === 0;
    if ((event as ToggleEvent).newState === 'open') {
      open.add(panel);
      resized?.observe(panel);
      placeAll();
      if (wasEmpty) listen(true);
    } else if (open.delete(panel)) {
      resized?.unobserve(panel);
      if (open.size === 0) listen(false);
    }
  };

  root.addEventListener('toggle', onToggle, { capture: true });
  return () => {
    root.removeEventListener('toggle', onToggle, { capture: true });
    resized?.disconnect();
    if (open.size) listen(false);
    if (frame) view?.cancelAnimationFrame(frame);
    open.clear();
  };
}
