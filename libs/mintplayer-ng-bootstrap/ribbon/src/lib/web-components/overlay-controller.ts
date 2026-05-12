import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface OverlayControllerOptions {
  trigger: () => HTMLElement | null;
  panel: () => HTMLElement | null;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Reusable popup-overlay primitive for Lit ribbon elements.
 *
 * Owns: open/close state, viewport-clamped horizontal positioning,
 * vertical flip when the panel would overflow the viewport bottom,
 * Escape-to-close, outside-mousedown-to-close, focus return to trigger.
 *
 * Re-renders the host via `requestUpdate()` on state changes so the host
 * template can bind `aria-expanded` to `overlay.isOpen` and reveal/hide
 * the panel via a CSS rule keyed on the host's `data-menu-open` attribute.
 */
export class OverlayController implements ReactiveController {
  /**
   * LIFO stack of currently-open overlay tokens across every ribbon overlay
   * instance. Each `open()` pushes a token, `close()` releases it. The Esc
   * keydown handler only fires when its overlay holds the top token, so nested
   * overlays unwind one-at-a-time (popup-inside-dropdown-menu-inside-popup
   * works as expected). This mirrors `BsOverlayStackService` from the a11y lib
   * but stays self-contained inside the Lit layer, since the Lit elements
   * can't reach Angular's DI tree.
   */
  private static readonly openStack: symbol[] = [];

  /**
   * Allocate a frame on top of the shared overlay stack. Use this from code
   * paths that don't own a full `OverlayController` instance (currently the
   * inline popup logic in `mp-ribbon-group`). Pair every `pushFrame()` with a
   * `releaseFrame(token)` to keep the stack consistent.
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

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    options: OverlayControllerOptions
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
    // Defer outside-click attachment so the opening click doesn't immediately close.
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
    if (returnFocus) this.options.trigger()?.focus();
    this.options.onClose?.();
  }

  private releaseStackToken(): void {
    if (!this.stackToken) return;
    OverlayController.releaseFrame(this.stackToken);
    this.stackToken = null;
  }

  private isTopOfStack(): boolean {
    return this.stackToken !== null && OverlayController.isFrameTop(this.stackToken);
  }

  async toggle(): Promise<void> {
    if (this._open) {
      this.close();
    } else {
      await this.open();
    }
  }

  position(): void {
    const trigger = this.options.trigger();
    const panel = this.options.panel();
    if (!trigger || !panel) return;

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

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
