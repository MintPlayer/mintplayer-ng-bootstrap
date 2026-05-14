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
   * M0 placeholder positioning: drop the panel below the anchor, clamp
   * horizontally to viewport, flip above if it would overflow the bottom.
   *
   * M1+ replaces this with the full position-pair selection algorithm,
   * scroll tracking, and sticky-offscreen fallback.
   */
  position(): void {
    const anchor = this.resolveAnchor();
    const panel = this.options.panel();
    if (!anchor || !panel) return;
    this.activeAnchor = anchor;

    const triggerRect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = this.options.viewportMargin ?? 8;

    let left = triggerRect.left;
    if (left + panelRect.width > vw - margin) {
      left = vw - panelRect.width - margin;
    }
    if (left < margin) left = margin;

    let top = triggerRect.bottom + 4;
    if (top + panelRect.height > vh - margin) {
      const above = triggerRect.top - panelRect.height - 4;
      if (above >= margin) top = above;
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

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
