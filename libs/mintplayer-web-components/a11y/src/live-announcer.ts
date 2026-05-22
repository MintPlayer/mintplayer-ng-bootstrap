import { html, type ReactiveController, type ReactiveControllerHost, type TemplateResult } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
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
 * Writes go directly to the rendered region's textContent (via a Lit `ref`).
 * That keeps announce() safe to call from inside the host's `updated()`
 * lifecycle hook — it never schedules a follow-up update, so it can't
 * trigger Lit's "change-in-update" warning.
 *
 * Why a controller and not a free-floating div appended to the shadow root:
 * Lit's render owns its render root; appending children outside the rendered
 * subtree is fragile across re-renders. Going through the template keeps the
 * region inside Lit's managed DOM and avoids "where did my element go" bugs.
 */
export class LiveAnnouncerController implements ReactiveController {
  private host: ReactiveControllerHost;
  private clearTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMessage: string | null = null;
  private readonly politeness: 'polite' | 'assertive';
  private readonly clearAfterMs: number;
  private readonly regionRef: Ref<HTMLDivElement> = createRef();

  constructor(host: ReactiveControllerHost, options: LiveAnnouncerOptions = {}) {
    this.host = host;
    this.politeness = options.politeness ?? 'polite';
    this.clearAfterMs = options.clearAfterMs ?? 1500;
    host.addController(this);
  }

  hostUpdated(): void {
    // Flush any announce() that arrived before the live region was rendered.
    if (this.pendingMessage !== null && this.regionRef.value) {
      const message = this.pendingMessage;
      this.pendingMessage = null;
      this.writeMessage(message);
    }
  }

  hostDisconnected(): void {
    if (this.clearTimer !== null) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }

  announce(message: string): void {
    if (!message) return;
    const region = this.regionRef.value;
    if (!region) {
      // Live region not yet mounted (announce called before first render).
      // Stash, ensure a render happens, deliver from hostUpdated().
      this.pendingMessage = message;
      this.host.requestUpdate();
      return;
    }
    this.writeMessage(message);
  }

  /** Returns the live-region template fragment. Call once inside the host's render(). */
  template(): TemplateResult {
    const role = this.politeness === 'assertive' ? 'alert' : 'status';
    return html`<div
      ${ref(this.regionRef)}
      role=${role}
      aria-live=${this.politeness}
      aria-atomic="true"
      style=${VISUALLY_HIDDEN}
    ></div>`;
  }

  private writeMessage(message: string): void {
    const region = this.regionRef.value;
    if (!region) return;
    if (region.textContent === message) {
      // Same string twice in a row would be a no-op for SRs that diff text.
      // Blank for a microtask, then set again so the diff fires.
      region.textContent = '';
      queueMicrotask(() => {
        const r = this.regionRef.value;
        if (r) r.textContent = message;
        this.scheduleClear();
      });
      return;
    }
    region.textContent = message;
    this.scheduleClear();
  }

  private scheduleClear(): void {
    if (this.clearTimer !== null) clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => {
      const region = this.regionRef.value;
      if (region) region.textContent = '';
      this.clearTimer = null;
    }, this.clearAfterMs);
  }
}
