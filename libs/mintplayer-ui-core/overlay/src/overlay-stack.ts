import { FocusTrap, inertRegions, type InertRegions, type InitialFocusTarget } from '@mintplayer/ui-core/focus';
import { BODY_HOST_ATTRIBUTE } from './body-host';
import { dismissStack } from './dismiss-stack';

/**
 * The one stack every overlay opens on (#458 §4.4): modal, offcanvas, popover,
 * tooltip, toast, dropdown, context menu. Each overlay renders into its own
 * body host (`createBodyHost`); opening it here gives that host
 *
 * - **z-order by open order.** Bootstrap's z-indices are per component (a
 *   dropdown 1000, a modal 1055), so a dropdown opened from a modal would paint
 *   under it. The host becomes a stacking context above every overlay opened
 *   before it, and the component's own z-index only orders within it. The value
 *   is computed per open, so it is written on the host (as `popover.ts` writes
 *   its computed placement), with a zero-size absolute box at the document
 *   origin, so an absolutely placed child keeps document coordinates and a fixed
 *   one keeps viewport coordinates.
 * - **focus trap and return** (`FocusTrap`), the trap gated on being the top
 *   dismiss frame so nested traps never fight;
 * - **`inert` behind the topmost modal overlay**, declared for the whole stack
 *   at once (`inertRegions`), so closing a nested modal never un-inerts what an
 *   outer one still hides;
 * - **Escape and outside dismissal** through `dismiss-stack`: one Escape closes
 *   exactly the top overlay.
 *
 * Opening an overlay also dismisses nothing by itself: the pickers' top-layer
 * popups stay where they are and close through their own dismiss frames.
 */
export const OVERLAY_Z_BASE = 1050;
export const OVERLAY_Z_STEP = 10;

export type OverlayDismissReason = 'escape' | 'outside';

export interface OverlayOptions {
  /** Hides everything behind it (`inert` + `aria-hidden`) and traps focus. Default false. */
  modal?: boolean;
  /** Default: `modal`. A menu traps nothing; a dialog-like popover may. */
  trapFocus?: boolean;
  /** Where focus goes on open, when trapping. Default `'first'`. */
  initialFocus?: InitialFocusTarget;
  /** Return focus to what had it at open, when trapping. Default true. */
  returnFocus?: boolean;
  /**
   * Called when the user dismisses the overlay while it is on top: Escape, or
   * (with `inside`) a pointerdown outside it. The overlay's core closes itself;
   * the stack never removes anything on its own.
   */
  onDismiss?: (reason: OverlayDismissReason) => void;
  /**
   * The elements a pointerdown may land on without dismissing, besides the host
   * (the toggle that opened a dropdown). Without it, outside clicks are ignored
   * (a modal's backdrop is its own element, handled by its core).
   */
  inside?: () => readonly (Element | null)[];
}

export interface OverlayHandle {
  /** The host's z-index. */
  readonly zIndex: number;
  /** Whether this overlay is the top dismiss frame. */
  isTop(): boolean;
  /** Close: release the frame, the trap, the listeners and the host's stacking. Idempotent. */
  close(): void;
}

interface Entry {
  readonly host: HTMLElement;
  readonly modal: boolean;
}

const entries: Entry[] = [];
let inert: InertRegions | null = null;

/** Declare the complete inert set: every body child before the topmost modal's host, but no overlay host above it. */
function declareInert(doc: Document): void {
  const top = entries.map((e) => e.modal).lastIndexOf(true);
  if (top < 0) {
    inert?.dispose();
    inert = null;
    return;
  }
  const visible = new Set(entries.slice(top).map((e) => e.host));
  inert ??= inertRegions();
  inert.setHidden(
    Array.from(doc.body.children).filter((el) => !visible.has(el as HTMLElement) && !(el.getAttribute(BODY_HOST_ATTRIBUTE) !== null && isAbove(el, top))),
  );
}

/** A body host of an overlay at or above `index` (one opened later, so it is not behind the modal). */
function isAbove(el: Element, index: number): boolean {
  return entries.findIndex((e) => e.host === el) >= index;
}

/** Open `host` (a body host) on the stack. Pair with `close()`. */
export function openOverlay(host: HTMLElement, options: OverlayOptions = {}): OverlayHandle {
  const doc = host.ownerDocument;
  const token = dismissStack.push('overlay');
  const entry: Entry = { host, modal: options.modal ?? false };
  const zIndex = OVERLAY_Z_BASE + (entries.length + 1) * OVERLAY_Z_STEP;
  entries.push(entry);

  host.style.setProperty('position', 'absolute');
  host.style.setProperty('top', '0');
  host.style.setProperty('left', '0');
  host.style.setProperty('z-index', String(zIndex));

  const isTop = (): boolean => dismissStack.isTop(token);
  const trap = (options.trapFocus ?? entry.modal)
    ? new FocusTrap(() => host, { initialFocus: options.initialFocus ?? 'first', returnFocus: options.returnFocus ?? true, enabled: isTop })
    : null;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || !isTop() || !options.onDismiss) return;
    event.preventDefault();
    options.onDismiss('escape');
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (!options.inside || !options.onDismiss || !isTop()) return;
    const target = event.target as Node | null;
    if (!target || host.contains(target) || options.inside().some((el) => el?.contains(target))) return;
    options.onDismiss('outside');
  };
  doc.addEventListener('keydown', onKeyDown);
  doc.addEventListener('pointerdown', onPointerDown, true);

  // Trap first: it records the trigger and moves focus in; inerting first would blur the trigger.
  trap?.activate();
  declareInert(doc);

  let open = true;
  return {
    zIndex,
    isTop,
    close() {
      if (!open) return;
      open = false;
      doc.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('pointerdown', onPointerDown, true);
      const index = entries.indexOf(entry);
      if (index >= 0) entries.splice(index, 1);
      declareInert(doc);
      // After un-inerting, so returned focus can land behind the overlay.
      trap?.deactivate();
      dismissStack.release(token);
      ['position', 'top', 'left', 'z-index'].forEach((name) => host.style.removeProperty(name));
    },
  };
}

/** Test seam: forget every open overlay. */
export function resetOverlayStackForTesting(): void {
  entries.length = 0;
  inert?.dispose();
  inert = null;
  dismissStack.resetForTesting();
}
