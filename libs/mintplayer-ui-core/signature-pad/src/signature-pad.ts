import { errorFeedback } from '@mintplayer/ui-core/forms';

/**
 * The signature pad's pure half (PRD #437): the model, the pointer-to-bitmap
 * mapping and the attribute bags every front renders.
 */

export const SIGNATURE_PAD_SCOPE = 'signature-pad';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
}

export interface Signature {
  strokes: Stroke[];
  /** Typed-signature alternative for users who cannot draw with a pointer. */
  text?: string;
}

export const emptySignature = (): Signature => ({ strokes: [] });

/** Nothing drawn and nothing typed. */
export const isEmptySignature = (signature: Signature | null | undefined) =>
  !signature || (!signature.strokes.length && !signature.text);

export interface SignaturePadLabels {
  /** The canvas's accessible name. */
  pad: string;
  /** The typed alternative's accessible name and placeholder. */
  type: string;
  undo: string;
  clear: string;
}

export const DEFAULT_SIGNATURE_PAD_LABELS: SignaturePadLabels = {
  pad: 'Signature pad',
  type: 'Type your signature',
  undo: 'Undo',
  clear: 'Clear',
};

/** The rendered box of the canvas, in CSS pixels (a DOMRect's relevant part). */
export interface RenderedBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Map a pointer position into canvas BITMAP coordinates.
 *
 * `offsetX/offsetY` are CSS pixels of the rendered box; when the canvas is
 * CSS-sized (e.g. `max-width: 100%`) those disagree with the `width`/`height`
 * drawing space and every stroke would land offset and stretched. Scaling by
 * bitmap-size / rendered-box keeps drawing correct under any CSS sizing.
 *
 * A box with no area (no layout yet, a hidden pad) cannot be scaled against,
 * so the offset coordinates are used as they are.
 */
export function toBitmapPoint(client: Point, offset: Point, box: RenderedBox, bitmap: { width: number; height: number }): Point {
  if (!box.width || !box.height) return { x: offset.x, y: offset.y };
  return {
    x: (client.x - box.left) * (bitmap.width / box.width),
    y: (client.y - box.top) * (bitmap.height / box.height),
  };
}

/** The typed signature's font size: 35% of the pad height, at most 64px. */
export const typedFontSize = (height: number) => Math.min(height * 0.35, 64);

export type SignaturePadBag = Record<string, string | number | boolean | null>;

export interface SignaturePadOptions {
  readonly id: string;
  readonly signature: Signature;
  readonly width: number;
  readonly height: number;
  readonly showAccessibilityToggle: boolean;
  readonly disabled: boolean;
  readonly required: boolean;
  /** Marks the pad invalid and shows `errorText` under it. */
  readonly invalid: boolean;
  readonly errorText: string | null;
  readonly hydrated: boolean;
  /** The canvas's accessible name: a consumer `aria-label`, else `inputLabel`. */
  readonly label: string | null;
  readonly labels?: Partial<SignaturePadLabels> | null;
}

export interface SignaturePadView {
  root: SignaturePadBag;
  canvas: SignaturePadBag;
  controls: SignaturePadBag;
  /** Null when `showAccessibilityToggle` is off. */
  typed: SignaturePadBag | null;
  undo: SignaturePadBag;
  undoText: string;
  clear: SignaturePadBag;
  clearText: string;
  showFeedback: boolean;
  feedback: { attrs: SignaturePadBag; text: string };
}

/**
 * The bags. Nothing works without JavaScript — a canvas cannot draw and the
 * typed text is only a signature once the core paints it — so before
 * hydration every control is disabled rather than enabled and inert.
 */
export function connectSignaturePad(options: SignaturePadOptions): SignaturePadView {
  const { id, signature, hydrated } = options;
  const labels = { ...DEFAULT_SIGNATURE_PAD_LABELS, ...options.labels };
  const scoped = (bag: SignaturePadBag): SignaturePadBag => ({ ...bag, 'data-mps': SIGNATURE_PAD_SCOPE });
  const error = errorFeedback(`${id}-error`, options.errorText, options.invalid);
  const inert = !hydrated || options.disabled;
  return {
    root: scoped({ class: ['mp-signature-pad', options.disabled ? 'mp-signature-pad-disabled' : null, options.invalid ? 'mp-signature-pad-invalid' : null].filter(Boolean).join(' ') }),
    canvas: scoped({
      class: 'signature-pad-canvas',
      width: options.width,
      height: options.height,
      role: 'img',
      'aria-label': options.label ?? labels.pad,
      // With no typed alternative the canvas is what the message describes.
      ...(options.showAccessibilityToggle ? {} : { 'aria-describedby': error.control['aria-describedby'] }),
    }),
    controls: scoped({ class: 'signature-pad-controls' }),
    typed: options.showAccessibilityToggle
      ? scoped({
          class: 'form-control form-control-sm signature-pad-text',
          id: `${id}-text`,
          type: 'text',
          autocomplete: 'off',
          'aria-label': labels.type,
          placeholder: labels.type,
          value: signature.text ?? '',
          disabled: inert,
          required: options.required,
          'aria-required': options.required ? 'true' : null,
          ...error.control,
        })
      : null,
    // Never disabled for being empty: pressing Clear would disable the button
    // under the keyboard user's focus and drop it to <body>. Empty is a no-op.
    undo: scoped({ type: 'button', class: 'btn btn-outline-secondary btn-sm signature-pad-undo', disabled: inert }),
    undoText: labels.undo,
    clear: scoped({ type: 'button', class: 'btn btn-outline-secondary btn-sm signature-pad-clear', disabled: inert }),
    clearText: labels.clear,
    showFeedback: !!error.message,
    feedback: error.message ? { attrs: { ...error.message.attrs, 'data-mps': SIGNATURE_PAD_SCOPE }, text: error.message.text } : { attrs: {}, text: '' },
  };
}
