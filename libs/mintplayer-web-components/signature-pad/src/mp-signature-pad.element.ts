import { LitElement, html, type TemplateResult } from 'lit';
import { query } from 'lit/decorators.js';
import { HostAriaController } from '@mintplayer/web-components/a11y';
import { styles } from './mp-signature-pad.element.template';
import type { Signature } from './types/signature';

/**
 * mp-signature-pad — freehand signature capture with a typed alternative.
 *
 * Freehand drawing is inherently pointer-only — there is no keyboard
 * equivalent for a hand-drawn stroke. The typed-signature input below the
 * canvas is the accessible alternative: its value is stored on
 * `Signature.text` and rendered onto the canvas in a script font, so a
 * keyboard-only user produces the same artifact through the same model.
 * Undo and Clear are plain buttons in the tab order.
 *
 * Properties / attributes:
 *  - `signature` (property only)  the full model: `{ strokes, text }`.
 *  - `width` / `height`           canvas dimensions in pixels.
 *  - `input-label`                accessible name of the canvas (role="img");
 *                                 a host `aria-label` wins, as everywhere in
 *                                 the library. Defaults to 'Signature pad'.
 *  - `type-label` / `undo-label` / `clear-label`  control labels.
 *
 * Events (bubbles + composed):
 *  - `signature-change`  detail = the current Signature, on every mutation
 *    (stroke point, typed character, undo, clear).
 */
export class MpSignaturePadElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    signature: { attribute: false },
    width: { attribute: 'width', type: Number, reflect: true },
    height: { attribute: 'height', type: Number, reflect: true },
    inputLabel: { attribute: 'input-label', type: String, reflect: false },
    typeLabel: { attribute: 'type-label', type: String, reflect: false },
    undoLabel: { attribute: 'undo-label', type: String, reflect: false },
    clearLabel: { attribute: 'clear-label', type: String, reflect: false },
    // Not a real property; listed so a host aria-label change re-renders. The
    // consumer's aria-label wins over inputLabel, same precedence as every
    // other control in the library.
    ariaLabelForRender: { attribute: 'aria-label', type: String, reflect: false },
    // Phantom too: reference attributes are re-resolved in updated().
    ariaLabelledByForSync: { attribute: 'aria-labelledby', type: String, reflect: false },
    ariaDescribedByForSync: { attribute: 'aria-describedby', type: String, reflect: false },
  };

  width = 500;
  height = 300;
  inputLabel: string | null = null;
  typeLabel = 'Type your signature';
  undoLabel = 'Undo';
  clearLabel = 'Clear';
  /** Mirror of the host aria-label attribute; exists only to trigger re-renders. */
  ariaLabelForRender: string | null = null;
  ariaLabelledByForSync: string | null = null;
  ariaDescribedByForSync: string | null = null;

  private _signature: Signature = { strokes: [] };
  private _isDrawing = false;
  private _context: CanvasRenderingContext2D | null = null;

  @query('canvas')
  private canvasEl?: HTMLCanvasElement;

  @query('input.form-control')
  private typedInputEl?: HTMLInputElement;

  /** Tier-2 naming: host aria-labelledby/-describedby resolve to the canvas. */
  private readonly hostAria = new HostAriaController(this, {
    referenceTarget: () => this.canvasEl ?? null,
  });

  get signature(): Signature {
    return this._signature;
  }

  set signature(next: Signature | null | undefined) {
    const old = this._signature;
    this._signature = next ?? { strokes: [] };
    this.requestUpdate('signature', old);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', this.onPointerEnd);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerup', this.onPointerEnd);
    }
  }

  /** Focus the pad = focus its typed-signature input (the keyboard entry point). */
  override focus(options?: FocusOptions): void {
    const input = this.typedInputEl;
    if (input) input.focus(options);
    else super.focus(options);
  }

  undo(): void {
    if (!this._signature.strokes.length) return;
    this._signature = { ...this._signature, strokes: this._signature.strokes.slice(0, -1) };
    this.requestUpdate();
    this.redraw();
    this.dispatchSignatureChange();
  }

  clear(): void {
    if (!this._signature.strokes.length && !this._signature.text) return;
    this._signature = { strokes: [] };
    this.requestUpdate();
    this.redraw();
    this.dispatchSignatureChange();
  }

  protected override firstUpdated(): void {
    this._context = this.canvasEl?.getContext('2d', { willReadFrequently: true }) ?? null;
    this.redraw();
  }

  protected override updated(changed: Map<string, unknown>): void {
    // After every render: references point at a specific node.
    this.hostAria.syncReferences();
    // Setting width/height resets the canvas bitmap; a model write replaces
    // what should be shown. Either way the pixels must be rebuilt from the
    // model. Interactive strokes draw incrementally and skip this path.
    if (changed.has('signature') || changed.has('width') || changed.has('height')) {
      this.redraw();
    }
  }

  /* ---- Drawing ---- */

  /**
   * Map a pointer event into canvas BITMAP coordinates. `offsetX/offsetY` are
   * CSS pixels of the rendered box; when the canvas is CSS-sized (e.g.
   * `width: 100%`) those disagree with the `width`/`height` drawing space and
   * every stroke would land offset and stretched. Scaling by
   * bitmap-size / rendered-rect keeps drawing correct under any CSS sizing.
   */
  private toCanvasPoint(ev: PointerEvent): { x: number; y: number } {
    const canvas = this.canvasEl;
    if (!canvas) return { x: ev.offsetX, y: ev.offsetY };
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: ev.offsetX, y: ev.offsetY };
    return {
      x: (ev.clientX - rect.left) * (canvas.width / rect.width),
      y: (ev.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  private onPointerStart = (ev: PointerEvent): void => {
    ev.preventDefault();
    this._isDrawing = true;
    const point = this.toCanvasPoint(ev);
    this._signature.strokes.push({ points: [point] });
    this._signature = { ...this._signature };
    if (this._context) {
      this._context.strokeStyle = 'black';
      this._context.beginPath();
      this._context.moveTo(point.x, point.y);
    }
    this.dispatchSignatureChange();
  };

  private onPointerMove = (ev: PointerEvent): void => {
    if (!this._isDrawing) return;
    ev.preventDefault();
    const point = this.toCanvasPoint(ev);
    this._signature.strokes.at(-1)?.points.push(point);
    this._signature = { ...this._signature };
    if (this._context) {
      this._context.lineTo(point.x, point.y);
      this._context.stroke();
    }
    this.dispatchSignatureChange();
  };

  private onPointerEnd = (ev: PointerEvent): void => {
    if (this._isDrawing) {
      ev.preventDefault();
      this._isDrawing = false;
    }
  };

  private onTypedInput = (ev: Event): void => {
    const text = (ev.target as HTMLInputElement).value;
    this._signature = { ...this._signature, text: text || undefined };
    this.redraw();
    this.dispatchSignatureChange();
  };

  /** Repaint the canvas from the model: every stroke, then the typed text. */
  private redraw(): void {
    const ctx = this._context;
    if (!ctx) return;
    const { strokes, text } = this._signature;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = 'black';
    ctx.strokeStyle = 'black';
    for (const stroke of strokes) {
      const [first, ...rest] = stroke.points;
      if (!first) continue;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (const point of rest) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }
    if (text) {
      ctx.font = `${Math.min(this.height * 0.35, 64)}px "Segoe Script", "Brush Script MT", cursive`;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 12, this.height / 2, this.width - 24);
    }
  }

  private dispatchSignatureChange(): void {
    this.dispatchEvent(new CustomEvent<Signature>('signature-change', {
      detail: this._signature,
      bubbles: true,
      composed: true,
    }));
  }

  /* ---- Render ---- */

  protected override render(): TemplateResult {
    const padLabel = this.getAttribute('aria-label') ?? this.inputLabel ?? 'Signature pad';
    return html`
      <canvas
        width=${this.width}
        height=${this.height}
        role="img"
        aria-label=${padLabel}
        @pointerdown=${this.onPointerStart}
        @pointermove=${this.onPointerMove}
      ></canvas>
      <div class="controls">
        <input
          class="form-control"
          type="text"
          aria-label=${this.typeLabel}
          placeholder=${this.typeLabel}
          .value=${this._signature.text ?? ''}
          @input=${this.onTypedInput}
        />
        <button type="button" class="control-btn" @click=${() => this.undo()}>${this.undoLabel}</button>
        <button type="button" class="control-btn" @click=${() => this.clear()}>${this.clearLabel}</button>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-signature-pad')) {
  customElements.define('mp-signature-pad', MpSignaturePadElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-signature-pad': MpSignaturePadElement;
  }
}
