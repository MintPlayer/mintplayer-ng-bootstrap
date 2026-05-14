import type { ReactiveController, ReactiveControllerHost } from 'lit';

export type OverlayOriginX = 'start' | 'center' | 'end';
export type OverlayOriginY = 'top' | 'center' | 'bottom';

export interface OverlayPosition {
  /** Which X corner of the anchor to align from. */
  originX: OverlayOriginX;
  /** Which Y corner of the anchor to align from. */
  originY: OverlayOriginY;
  /** Which X corner of the overlay panel to align to. */
  overlayX: OverlayOriginX;
  /** Which Y corner of the overlay panel to align to. */
  overlayY: OverlayOriginY;
  /** Optional pixel offset, applied after corner alignment. */
  offsetX?: number;
  offsetY?: number;
}

export type ScrollStrategy =
  | 'reposition' // re-position on every scroll (default; CDK parity)
  | 'block'      // block scrolling on host scrollparents while open
  | 'close'      // close on any scroll
  | 'noop';      // ignore scroll — escape hatch

export interface OverlayControllerOptions {
  /**
   * Single anchor or array of candidate anchors. When an array, the controller
   * walks anchors in order and picks the first non-null one as the active
   * anchor for positioning.
   */
  trigger: () => HTMLElement | HTMLElement[] | null;
  panel: () => HTMLElement | null;
  /**
   * Ordered list of position candidates. The first one that produces a
   * panel rect fully inside the viewport (minus `viewportMargin`) is used.
   * Default: drop below the anchor, flip above on overflow.
   */
  positions?: OverlayPosition[];
  /** Pixel margin between the panel and the viewport edges. Default: 8. */
  viewportMargin?: number;
  /** Scroll behaviour while the panel is open. Default: 'reposition'. */
  scrollStrategy?: ScrollStrategy;
  /**
   * When `true`, the panel stays pinned to the nearest viewport edge if the
   * anchor scrolls completely out of viewport. Default: false (CDK parity).
   */
  stickyOnAnchorOffscreen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const DEFAULT_POSITIONS: OverlayPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
];

/**
 * Reusable popup-overlay primitive for Lit elements, modeled on Angular CDK's
 * FlexibleConnectedPositionStrategy + scrollStrategies.reposition() but
 * framework-agnostic (no @angular/cdk dependency).
 *
 * Features (built across M1–M5):
 *  - Position-pair selection: walks `positions` and uses the first candidate
 *    that produces a panel rect fully inside the viewport.
 *  - Scroll tracking: 'reposition' / 'block' / 'close' / 'noop' strategies.
 *  - Resize handling: window.resize re-runs positioning (rAF-batched).
 *  - Sticky-on-offscreen: optionally pins the panel to the nearest viewport
 *    edge when the anchor scrolls completely out of view.
 *  - Multi-anchor: trigger() may return an array; first non-null wins.
 *  - Esc-stack: shared LIFO stack so nested overlays unwind one at a time.
 *
 * In M0, ships with: type definitions, single-anchor `trigger()`, static
 * positioning (no scroll tracking), Esc-stack, outside-click close, focus
 * return on close. M1+ build out behaviour.
 */
export class OverlayController implements ReactiveController {
  private static readonly openStack: symbol[] = [];

  /**
   * Allocate a frame on top of the shared overlay stack. Use this from code
   * paths that don't own a full `OverlayController` instance. Pair every
   * `pushFrame()` with a `releaseFrame(token)`.
   */
  static pushFrame(): symbol {
    const token = Symbol('overlay-frame-external');
    OverlayController.openStack.push(token);
    return token;
  }

  static releaseFrame(token: symbol): void {
    const idx = OverlayController.openStack.lastIndexOf(token);
    if (idx >= 0) OverlayController.openStack.splice(idx, 1);
  }

  static isFrameTop(token: symbol): boolean {
    return (
      OverlayController.openStack.length > 0 &&
      OverlayController.openStack[OverlayController.openStack.length - 1] === token
    );
  }

  private readonly host: ReactiveControllerHost & HTMLElement;
  private readonly options: OverlayControllerOptions;
  private _open = false;
  private mouseDownAttached = false;
  private stackToken: symbol | null = null;
  /** Anchor used by the last positioning pass. Drives focus-return on close. */
  private activeAnchor: HTMLElement | null = null;
  /** rAF id for the next scheduled position() call. 0 = none scheduled. */
  private positionFrame = 0;
  /** True while scroll-tracking listeners are attached. */
  private scrollListenersAttached = false;
  /** Saved scrollTop/scrollLeft when 'block' strategy is active. */
  private blockedScroll: { top: number; left: number } | null = null;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    options: OverlayControllerOptions,
  ) {
    this.host = host;
    this.options = options;
    host.addController(this);
  }

  hostConnected(): void {
    document.addEventListener('keydown', this.onKeyDown);
  }

  hostDisconnected(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    this.detachMouseDown();
    if (this.stackToken) this.releaseStackToken();
  }

  get isOpen(): boolean {
    return this._open;
  }

  async open(): Promise<void> {
    if (this._open) return;
    this._open = true;
    this.stackToken = OverlayController.pushFrame();
    this.host.setAttribute('data-menu-open', '');
    this.host.requestUpdate();
    await this.host.updateComplete;
    this.position();
    this.attachScrollListeners();
    setTimeout(() => this.attachMouseDown(), 0);
    this.options.onOpen?.();
  }

  close(returnFocus = true): void {
    if (!this._open) return;
    this._open = false;
    this.releaseStackToken();
    this.host.removeAttribute('data-menu-open');
    this.host.requestUpdate();
    this.detachMouseDown();
    this.detachScrollListeners();
    if (this.positionFrame) {
      cancelAnimationFrame(this.positionFrame);
      this.positionFrame = 0;
    }
    if (returnFocus) this.activeAnchor?.focus();
    this.activeAnchor = null;
    this.options.onClose?.();
  }

  async toggle(): Promise<void> {
    if (this._open) {
      this.close();
    } else {
      await this.open();
    }
  }

  /**
   * Resolve the active anchor from `trigger()`, supporting both single-element
   * and array returns. The first non-null element wins.
   */
  protected resolveAnchor(): HTMLElement | null {
    const raw = this.options.trigger();
    if (raw === null) return null;
    if (Array.isArray(raw)) {
      for (const candidate of raw) {
        if (candidate) return candidate;
      }
      return null;
    }
    return raw;
  }

  /**
   * Walk the configured `positions` and pick the first candidate whose panel
   * rect fully fits inside the viewport (minus `viewportMargin`). If none fit,
   * the last candidate is applied and clamped to viewport edges (push behaviour).
   *
   * `start`/`end` are direction-aware: in RTL contexts they swap to match
   * visual layout.
   */
  position(): void {
    const anchor = this.resolveAnchor();
    const panel = this.options.panel();
    if (!anchor || !panel) return;
    this.activeAnchor = anchor;

    const positions = this.options.positions ?? DEFAULT_POSITIONS;
    const margin = this.options.viewportMargin ?? 8;
    const triggerRect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rtl = this.isRtl();

    let chosen: { left: number; top: number } | null = null;

    for (const candidate of positions) {
      const placed = this.placeFor(candidate, triggerRect, panelRect, rtl);
      if (this.fitsInViewport(placed, panelRect, vw, vh, margin)) {
        chosen = placed;
        break;
      }
      // Remember the last candidate so we can fall back to it if nothing fits.
      chosen = placed;
    }

    if (!chosen) return;

    // Clamp the final position into the viewport. If a candidate fit cleanly
    // this is a no-op; otherwise this is the "push" fallback that keeps the
    // panel reachable even when no position is a clean fit.
    const clamped = this.clampToViewport(chosen, panelRect, vw, vh, margin);
    panel.style.left = `${clamped.left}px`;
    panel.style.top = `${clamped.top}px`;
  }

  private isRtl(): boolean {
    return getComputedStyle(this.host).direction === 'rtl';
  }

  /**
   * Compute the (left, top) at which `panel` should be placed for a single
   * position candidate. The candidate identifies which corner of the anchor
   * to align which corner of the panel to, plus optional pixel offsets.
   */
  private placeFor(
    candidate: OverlayPosition,
    triggerRect: DOMRect,
    panelRect: DOMRect,
    rtl: boolean,
  ): { left: number; top: number } {
    const anchorX = this.anchorXFor(candidate.originX, triggerRect, rtl);
    const anchorY = this.anchorYFor(candidate.originY, triggerRect);
    const panelXOffset = this.panelXOffsetFor(candidate.overlayX, panelRect.width, rtl);
    const panelYOffset = this.panelYOffsetFor(candidate.overlayY, panelRect.height);
    return {
      left: anchorX + panelXOffset + (candidate.offsetX ?? 0),
      top: anchorY + panelYOffset + (candidate.offsetY ?? 0),
    };
  }

  private anchorXFor(origin: OverlayOriginX, rect: DOMRect, rtl: boolean): number {
    // In RTL, 'start' visually maps to the right edge of the anchor.
    const start = rtl ? rect.right : rect.left;
    const end = rtl ? rect.left : rect.right;
    if (origin === 'start') return start;
    if (origin === 'end') return end;
    return rect.left + rect.width / 2;
  }

  private anchorYFor(origin: OverlayOriginY, rect: DOMRect): number {
    if (origin === 'top') return rect.top;
    if (origin === 'bottom') return rect.bottom;
    return rect.top + rect.height / 2;
  }

  private panelXOffsetFor(overlayX: OverlayOriginX, width: number, rtl: boolean): number {
    // Offset = amount to shift the panel left so that its (start | center | end)
    // edge lines up with the anchor point. In RTL, the panel's 'start' is its
    // right edge, so we mirror.
    if (overlayX === 'start') return rtl ? -width : 0;
    if (overlayX === 'end') return rtl ? 0 : -width;
    return -width / 2;
  }

  private panelYOffsetFor(overlayY: OverlayOriginY, height: number): number {
    if (overlayY === 'top') return 0;
    if (overlayY === 'bottom') return -height;
    return -height / 2;
  }

  private fitsInViewport(
    placed: { left: number; top: number },
    panelRect: DOMRect,
    vw: number,
    vh: number,
    margin: number,
  ): boolean {
    return (
      placed.left >= margin &&
      placed.top >= margin &&
      placed.left + panelRect.width <= vw - margin &&
      placed.top + panelRect.height <= vh - margin
    );
  }

  private clampToViewport(
    placed: { left: number; top: number },
    panelRect: DOMRect,
    vw: number,
    vh: number,
    margin: number,
  ): { left: number; top: number } {
    let { left, top } = placed;
    if (left + panelRect.width > vw - margin) left = vw - panelRect.width - margin;
    if (left < margin) left = margin;
    if (top + panelRect.height > vh - margin) top = vh - panelRect.height - margin;
    if (top < margin) top = margin;
    return { left, top };
  }

  /* ---- Scroll + resize tracking ---- */

  private currentStrategy(): ScrollStrategy {
    return this.options.scrollStrategy ?? 'reposition';
  }

  /**
   * Wire scroll + resize listeners according to the active strategy. Called
   * from open(); paired with detachScrollListeners() in close().
   *
   * The capture-phase listener on document catches scroll events from any
   * scrollable ancestor without us having to walk the DOM — scroll events
   * don't bubble, but capture-phase listeners receive every dispatch.
   */
  private attachScrollListeners(): void {
    if (this.scrollListenersAttached) return;
    this.scrollListenersAttached = true;
    const strategy = this.currentStrategy();
    if (strategy === 'noop') return;

    window.addEventListener('resize', this.onResize, { passive: true });

    if (strategy === 'block') {
      this.applyBlockScroll();
      return;
    }

    // 'reposition' + 'close' both attach a document-wide capture listener.
    document.addEventListener('scroll', this.onScroll, {
      passive: true,
      capture: true,
    });
  }

  private detachScrollListeners(): void {
    if (!this.scrollListenersAttached) return;
    this.scrollListenersAttached = false;
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('scroll', this.onScroll, true);
    this.releaseBlockScroll();
  }

  private onScroll = (): void => {
    if (!this._open) return;
    const strategy = this.currentStrategy();
    if (strategy === 'close') {
      this.close(false);
      return;
    }
    if (strategy === 'reposition') this.schedulePosition();
  };

  private onResize = (): void => {
    if (!this._open) return;
    this.schedulePosition();
  };

  private schedulePosition(): void {
    if (this.positionFrame) return;
    this.positionFrame = requestAnimationFrame(() => {
      this.positionFrame = 0;
      this.position();
    });
  }

  /**
   * 'block' strategy: lock the document scroll position while the overlay is
   * open. Mirrors CDK's BlockScrollStrategy — sets position: fixed on the html
   * element with the saved offset, then restores on close. Cheap; no event
   * preventDefault dance required.
   */
  private applyBlockScroll(): void {
    if (this.blockedScroll) return;
    const html = document.documentElement;
    const top = html.scrollTop || window.scrollY;
    const left = html.scrollLeft || window.scrollX;
    this.blockedScroll = { top, left };
    html.style.setProperty('--overlay-blocked-top', `-${top}px`);
    html.style.setProperty('--overlay-blocked-left', `-${left}px`);
    html.style.position = 'fixed';
    html.style.top = `-${top}px`;
    html.style.left = `-${left}px`;
    html.style.width = '100%';
  }

  private releaseBlockScroll(): void {
    if (!this.blockedScroll) return;
    const { top, left } = this.blockedScroll;
    this.blockedScroll = null;
    const html = document.documentElement;
    html.style.position = '';
    html.style.top = '';
    html.style.left = '';
    html.style.width = '';
    html.style.removeProperty('--overlay-blocked-top');
    html.style.removeProperty('--overlay-blocked-left');
    window.scrollTo(left, top);
  }

  /* ---- Esc-stack ---- */

  private releaseStackToken(): void {
    if (!this.stackToken) return;
    OverlayController.releaseFrame(this.stackToken);
    this.stackToken = null;
  }

  private isTopOfStack(): boolean {
    return this.stackToken !== null && OverlayController.isFrameTop(this.stackToken);
  }

  private attachMouseDown(): void {
    if (this.mouseDownAttached) return;
    document.addEventListener('mousedown', this.onMouseDown, true);
    this.mouseDownAttached = true;
  }

  private detachMouseDown(): void {
    if (!this.mouseDownAttached) return;
    document.removeEventListener('mousedown', this.onMouseDown, true);
    this.mouseDownAttached = false;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this._open && this.isTopOfStack()) {
      this.close();
      event.preventDefault();
    }
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (!this._open) return;
    if (event.composedPath().includes(this.host)) return;
    this.close(false);
  };
}

// Default positions exported so consumers can compose them.
export { DEFAULT_POSITIONS };
