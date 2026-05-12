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
  private readonly host: ReactiveControllerHost & HTMLElement;
  private readonly options: OverlayControllerOptions;
  private _open = false;
  private mouseDownAttached = false;

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
  }

  get isOpen(): boolean {
    return this._open;
  }

  async open(): Promise<void> {
    if (this._open) return;
    this._open = true;
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
    this.host.removeAttribute('data-menu-open');
    this.host.requestUpdate();
    this.detachMouseDown();
    if (returnFocus) this.options.trigger()?.focus();
    this.options.onClose?.();
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
    if (event.key === 'Escape' && this._open) {
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
