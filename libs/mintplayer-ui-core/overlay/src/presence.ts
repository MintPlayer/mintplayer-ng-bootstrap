import { BODY_HOST_ATTRIBUTE, refreshBodyHost } from './body-host';
import { openOverlay, type OverlayHandle, type OverlayOptions } from './overlay-stack';

/**
 * How an overlay core opens and closes its body-hosted markup (#458 M6). Every
 * overlay (modal, offcanvas, popover, tooltip, toast, dropdown, context menu)
 * keeps a phase in its state and renders from it:
 *
 *   closed ──open──▶ entering ──rendered──▶ shown ──close──▶ leaving ──transition──▶ closed
 *
 * - `entering`: the markup renders without Bootstrap's `.show`, so the next
 *   phase has a starting point to transition from;
 * - `shown`: rendered with `.show`, and on the overlay stack (`openOverlay`:
 *   z-order, focus trap and return, `inert`, Escape and outside dismissal);
 * - `leaving`: off the stack (focus has already returned), still rendered
 *   without `.show` until its transition ends. Under reduced motion Bootstrap
 *   sets `transition: none`, so it ends at once.
 *
 * The overlay renders into a body host in every front, after a framework
 * render this engine cannot see, so it waits for the markup (`whenRendered`)
 * rather than a frame.
 *
 * **Kept after the first open (#465).** The markup is created on the first
 * open and kept while closed, so consumer content (a form, a scroll position,
 * a component's own state) survives a close. A core keeps `kept` in its state
 * (`phaseState`) and renders while `isKept`; every body-hosted root carries
 * `phaseBag(phase)`: the phase, which `whenRendered` waits on, and `hidden`
 * while closed (out of sight, the tab order and the accessibility tree).
 */
export type OverlayPhase = 'closed' | 'entering' | 'shown' | 'leaving';

/** Whether a phase is open or transitioning (the overlay is in use). */
export const isRendered = (phase: OverlayPhase): boolean => phase !== 'closed';

/** Whether a phase carries Bootstrap's `.show`. */
export const isShown = (phase: OverlayPhase): boolean => phase === 'shown';

/** The phase, stamped on each body-hosted root in the render that shows it. */
export const PHASE_ATTR = 'data-mp-phase';

/** The part of an overlay core's state presence writes. */
export interface PresenceState {
  phase: OverlayPhase;
  /** Opened at least once: the markup stays rendered (hidden) while closed. */
  kept: boolean;
}

/** The state patch for a phase change: a phase other than `closed` latches `kept`. */
export const phaseState = (phase: OverlayPhase): Partial<PresenceState> => (phase === 'closed' ? { phase } : { phase, kept: true });

/** Whether the overlay's markup renders: in use now, or opened before. */
export const isKept = (state: PresenceState): boolean => state.kept || isRendered(state.phase);

/** The attributes every body-hosted root of an overlay carries. */
export const phaseBag = (phase: OverlayPhase): { [PHASE_ATTR]: OverlayPhase; hidden: boolean } => ({ [PHASE_ATTR]: phase, hidden: phase === 'closed' });

export interface PresenceOptions {
  readonly doc: Document;
  /** The overlay's rendered root, or null while it is not in the document. */
  find(): HTMLElement | null;
  /** Write the phase into the core's state (the render follows it). */
  setPhase(phase: OverlayPhase): void;
  /** The stack options for one open, given the rendered root. */
  overlay(el: HTMLElement): OverlayOptions;
  /** Wire listeners on the rendered root for one open; returns their cleanup. */
  wire?(el: HTMLElement): () => void;
  /** The elements whose transitions the leave waits for. Default: the root. */
  transitioning?(el: HTMLElement): readonly Element[];
}

export class OverlayPresence {
  #phase: OverlayPhase;
  #handle: OverlayHandle | null = null;
  #unwire: (() => void) | null = null;
  #cancel: (() => void) | null = null;

  /** @param phase The phase the state was seeded with (an overlay open at load starts `shown`). */
  constructor(private readonly options: PresenceOptions, phase: OverlayPhase = 'closed') {
    this.#phase = phase;
  }

  get phase(): OverlayPhase {
    return this.#phase;
  }

  /** The stack handle while shown (a popover reads its z-index). */
  get handle(): OverlayHandle | null {
    return this.#handle;
  }

  /** Drive the overlay open or closed. Idempotent; reopening while leaving shows it again. */
  set(open: boolean): void {
    if (open) {
      if (this.#handle || this.#phase === 'entering') return;
      this.#cancelPending();
      const shownAlready = this.#phase === 'shown';
      if (!shownAlready) this.#go('entering');
      // Wait for the render of THIS phase, not just the root: a kept root is already there in
      // its closed form (#465), and opening that would trap focus in hidden markup and start
      // the transition from `display: none`.
      const ready = () => {
        const el = this.options.find();
        const phase = el?.getAttribute(PHASE_ATTR);
        return phase === 'entering' || phase === 'shown' ? el : null;
      };
      this.#cancel = whenRendered(this.options.doc, ready, (el) => {
        this.#cancel = null;
        const host = (el.closest(`[${BODY_HOST_ATTRIBUTE}]`) as HTMLElement | null) ?? el;
        refreshBodyHost(host);
        this.#handle = openOverlay(host, this.options.overlay(el));
        this.#unwire = this.options.wire?.(el) ?? null;
        // Flush the entering styles, so the change to `.show` transitions from them.
        void el.offsetHeight;
        this.#go('shown');
      });
      return;
    }
    if (this.#phase === 'closed' || this.#phase === 'leaving') return;
    this.#cancelPending();
    this.#release();
    const el = this.options.find();
    if (!el) {
      this.#go('closed');
      return;
    }
    this.#go('leaving');
    this.#cancel = afterTransition(this.options.transitioning?.(el) ?? [el], () => {
      this.#cancel = null;
      this.#go('closed');
    });
  }

  /** Tear everything down (the component is destroyed). */
  dispose(): void {
    this.#cancelPending();
    this.#release();
  }

  #go(phase: OverlayPhase): void {
    if (phase === this.#phase) return;
    this.#phase = phase;
    this.options.setPhase(phase);
  }

  #cancelPending(): void {
    this.#cancel?.();
    this.#cancel = null;
  }

  #release(): void {
    this.#unwire?.();
    this.#unwire = null;
    this.#handle?.close();
    this.#handle = null;
  }
}

/**
 * Call `found` with what `find` returns, now if it exists, else after the body
 * mutation that adds it (or, for a kept root, the `data-mp-phase` change that
 * makes `find` accept it). Returns a cancel.
 */
export function whenRendered(doc: Document, find: () => HTMLElement | null, found: (el: HTMLElement) => void): () => void {
  const now = find();
  if (now) {
    found(now);
    return () => undefined;
  }
  const Observer = doc.defaultView?.MutationObserver;
  if (!Observer || !doc.body) return () => undefined;
  const observer = new Observer(() => {
    const el = find();
    if (!el) return;
    observer.disconnect();
    found(el);
  });
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: [PHASE_ATTR] });
  return () => observer.disconnect();
}

/** The element of `doc` whose `attribute` equals `value`, read by attribute (no selector escaping). */
export function findByAttribute(doc: Document, attribute: string, value: string | null): HTMLElement | null {
  if (!value) return null;
  return (Array.from(doc.querySelectorAll(`[${attribute}]`)).find((el) => el.getAttribute(attribute) === value) as HTMLElement | undefined) ?? null;
}

/** The longest transition (duration + delay) on `el`, in ms. Zero under `transition: none`. */
export function transitionMs(el: Element): number {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (!style) return 0;
  const times = (value: string): number[] =>
    (value || '0s').split(',').map((part) => {
      const n = parseFloat(part);
      return Number.isFinite(n) ? n * (part.trim().endsWith('ms') ? 1 : 1000) : 0;
    });
  const durations = times(style.transitionDuration);
  const delays = times(style.transitionDelay);
  return Math.max(0, ...durations.map((d, i) => d + (delays[i % delays.length] ?? 0)));
}

/** Call `done` once the longest transition of `els` has run (at once when there is none). Returns a cancel. */
export function afterTransition(els: readonly Element[], done: () => void): () => void {
  const ms = Math.max(0, ...els.map(transitionMs));
  if (!ms) {
    done();
    return () => undefined;
  }
  const timer = setTimeout(done, ms + 20);
  return () => clearTimeout(timer);
}
