import { html, nothing, type ReactiveController, type ReactiveControllerHost, type TemplateResult } from 'lit';

export interface LiveAnnouncerOptions {
  /** "polite" waits for an SR-idle moment; "assertive" interrupts. Default: "polite". */
  politeness?: 'polite' | 'assertive';
  /** ms after which the live region is blanked so the same message can re-announce later. Default: 1500. */
  clearAfterMs?: number;
}

const VISUALLY_HIDDEN =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';

/**
 * Lit reactive controller that owns a visually-hidden live region for a Lit
 * web component. Call announce() to push a message; call template() once
 * inside the host's render() to drop the live region into the shadow tree.
 *
 * Why a controller and not a free-floating div appended to the shadow root:
 * Lit's render owns its render root; appending children outside the rendered
 * subtree is fragile across re-renders. Going through the template keeps the
 * region inside Lit's managed DOM and avoids "where did my element go" bugs.
 */
export class LiveAnnouncerController implements ReactiveController {
  private host: ReactiveControllerHost;
  private message = '';
  private clearTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly politeness: 'polite' | 'assertive';
  private readonly clearAfterMs: number;

  constructor(host: ReactiveControllerHost, options: LiveAnnouncerOptions = {}) {
    this.host = host;
    this.politeness = options.politeness ?? 'polite';
    this.clearAfterMs = options.clearAfterMs ?? 1500;
    host.addController(this);
  }

  hostDisconnected(): void {
    if (this.clearTimer !== null) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }

  announce(message: string): void {
    if (!message) return;
    if (message === this.message) {
      // Same string twice in a row would be a no-op for SRs that diff text.
      // Blank for a microtask, then set again so the diff fires.
      this.message = '';
      this.host.requestUpdate();
      queueMicrotask(() => {
        this.message = message;
        this.host.requestUpdate();
        this.scheduleClear();
      });
      return;
    }
    this.message = message;
    this.host.requestUpdate();
    this.scheduleClear();
  }

  /** Returns the live-region template fragment. Call once inside the host's render(). */
  template(): TemplateResult {
    const role = this.politeness === 'assertive' ? 'alert' : 'status';
    return html`<div
      role=${role}
      aria-live=${this.politeness}
      aria-atomic="true"
      style=${VISUALLY_HIDDEN}
    >${this.message || nothing}</div>`;
  }

  private scheduleClear(): void {
    if (this.clearTimer !== null) clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => {
      this.message = '';
      this.host.requestUpdate();
      this.clearTimer = null;
    }, this.clearAfterMs);
  }
}
