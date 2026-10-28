import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import {
  connectSignaturePad,
  emptySignature,
  isEmptySignature,
  toBitmapPoint,
  typedFontSize,
  type Point,
  type Signature,
  type SignaturePadLabels,
  type SignaturePadView,
} from './signature-pad';

/**
 * The signature pad's core (PRD #437 D10): what the generated Angular, React,
 * Vue and Lit components host. `signature-pad.component.ts` is its manifest
 * and `templates/signature-pad.view.vue` its markup.
 *
 * Freehand drawing is inherently pointer-only. The typed field under the
 * canvas is the keyboard alternative: its text is stored on `Signature.text`
 * and painted onto the canvas in a script font, so a keyboard user produces
 * the same artifact through the same model. Undo and Clear are plain buttons.
 */

export interface SignaturePadInputs {
  /** The signature: strokes and typed text. Written through as the user draws or types. */
  signature: Signature;
  /** Canvas bitmap width in pixels. */
  width: number;
  /** Canvas bitmap height in pixels. */
  height: number;
  /** Shows the typed alternative: on by default, as it is the only keyboard path. */
  showAccessibilityToggle: boolean;
  disabled: boolean;
  required: boolean;
  /** Marks the pad invalid and shows `errorText` under it. */
  invalid: boolean;
  /** The validation message, referenced from the typed field while `invalid`. */
  errorText: string | null;
  /** The canvas's accessible name (default "Signature pad"); an `aria-label` on the component wins. */
  inputLabel: string | null;
  labels: Partial<SignaturePadLabels> | null;
}

export interface SignaturePadState {
  signature: Signature;
}

export interface SignaturePadEvents {
  /** Every stroke point, typed character, undo and clear: the current signature. */
  signatureChange: Signature;
}

export interface SignaturePadMethods {
  /** Remove the most recent stroke, and report it. */
  undo(): void;
  /** Wipe the strokes and the typed text, and report it. */
  clear(): void;
  /** Move focus to the typed field. */
  focusInput(options?: FocusOptions): void;
}

type Api = CoreApi<SignaturePadInputs, SignaturePadState, SignaturePadEvents>;

const canvasOf = (api: Api) => api.host.querySelector<HTMLCanvasElement>('canvas.signature-pad-canvas');
const typedOf = (api: Api) => api.host.querySelector<HTMLInputElement>('input.signature-pad-text');

/** Repaint the canvas from the model: every stroke, then the typed text. */
function redraw(api: Api) {
  const canvas = canvasOf(api);
  const ctx = canvas?.getContext('2d', { willReadFrequently: true });
  if (!canvas || !ctx) return;
  const { strokes, text } = api.state().signature;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'black';
  for (const stroke of strokes) {
    const [first, ...rest] = stroke.points;
    if (!first) continue;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of rest) ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  if (text) {
    ctx.font = `${typedFontSize(canvas.height)}px "Segoe Script", "Brush Script MT", cursive`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 12, canvas.height / 2, canvas.width - 24);
  }
}

/** The typed field shows the model: a bag value is only a seed. */
function syncTyped(api: Api) {
  const typed = typedOf(api);
  const text = api.state().signature.text ?? '';
  if (typed && typed.value !== text) typed.value = text;
}

/**
 * A user's change: state, event, and the typed field. Copy-on-write: the model
 * may be the consumer's own object, and every emitted detail is a snapshot.
 */
function commit(api: Api, signature: Signature, paint: boolean) {
  api.setState({ signature });
  if (paint) redraw(api);
  syncTyped(api);
  api.emit('signatureChange', signature);
}

function undo(api: Api) {
  const { signature } = api.state();
  if (api.inputs().disabled || !signature.strokes.length) return;
  commit(api, { ...signature, strokes: signature.strokes.slice(0, -1) }, true);
}

function clear(api: Api) {
  if (api.inputs().disabled || isEmptySignature(api.state().signature)) return;
  commit(api, emptySignature(), true);
}

export const signaturePadCore = defineCore<
  SignaturePadInputs,
  SignaturePadState,
  { view: SignaturePadView },
  SignaturePadEvents,
  undefined,
  undefined,
  SignaturePadMethods
>({
  state: (inputs) => ({ signature: inputs.signature ?? emptySignature() }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectSignaturePad({
      id,
      signature: state.signature,
      width: inputs.width,
      height: inputs.height,
      showAccessibilityToggle: inputs.showAccessibilityToggle,
      disabled: inputs.disabled,
      required: inputs.required,
      invalid: inputs.invalid,
      errorText: inputs.errorText,
      hydrated,
      label: label ?? inputs.inputLabel,
      labels: inputs.labels,
    }),
  }),
  attach: (api) => {
    const host = api.host;
    let drawing: { pointerId: number; context: CanvasRenderingContext2D | null } | null = null;

    const pointOf = (event: PointerEvent): Point => {
      const canvas = canvasOf(api);
      const offset = { x: event.offsetX, y: event.offsetY };
      if (!canvas) return offset;
      return toBitmapPoint({ x: event.clientX, y: event.clientY }, offset, canvas.getBoundingClientRect(), canvas);
    };

    // No preventDefault on pointerdown: `touch-action: none` on the canvas is
    // what stops a touch from scrolling, and pointer capture keeps the stroke
    // when the pointer leaves the canvas.
    const onPointerDown = (event: PointerEvent) => {
      const canvas = canvasOf(api);
      if (!canvas || event.target !== canvas || api.inputs().disabled || event.button > 0) return;
      canvas.setPointerCapture?.(event.pointerId);
      const point = pointOf(event);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.strokeStyle = 'black';
        context.beginPath();
        context.moveTo(point.x, point.y);
      }
      drawing = { pointerId: event.pointerId, context };
      const { signature } = api.state();
      commit(api, { ...signature, strokes: [...signature.strokes, { points: [point] }] }, false);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      const point = pointOf(event);
      const { signature } = api.state();
      const last = signature.strokes.at(-1);
      if (!last) return;
      drawing.context?.lineTo(point.x, point.y);
      drawing.context?.stroke();
      commit(api, { ...signature, strokes: [...signature.strokes.slice(0, -1), { ...last, points: [...last.points, point] }] }, false);
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (drawing?.pointerId === event.pointerId) drawing = null;
    };
    const onInput = (event: Event) => {
      const typed = typedOf(api);
      if (event.target !== typed || !typed) return;
      commit(api, { ...api.state().signature, text: typed.value || undefined }, true);
    };
    const onClick = (event: Event) => {
      const button = (event.target as Element).closest?.('button');
      if (!button || !host.contains(button)) return;
      if (button.classList.contains('signature-pad-undo')) undo(api);
      else if (button.classList.contains('signature-pad-clear')) clear(api);
    };

    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', onPointerEnd);
    host.addEventListener('pointercancel', onPointerEnd);
    host.addEventListener('input', onInput);
    host.addEventListener('click', onClick);
    // Writing `width` / `height` resets the bitmap, and the front writes them
    // AFTER inputsChanged runs: repaint once the attribute has landed.
    const resized = new MutationObserver(() => redraw(api));
    const canvas = canvasOf(api);
    if (canvas) resized.observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
    syncTyped(api);
    redraw(api);
    return () => {
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerEnd);
      host.removeEventListener('pointercancel', onPointerEnd);
      host.removeEventListener('input', onInput);
      host.removeEventListener('click', onClick);
      resized.disconnect();
    };
  },
  inputsChanged: (api, prev) => {
    const { signature } = api.inputs();
    // A written signature replaces what is shown; the user's own, echoed back
    // through the model, is already on the canvas.
    if (signature !== prev.signature && signature !== api.state().signature) {
      api.setState({ signature: signature ?? emptySignature() });
      redraw(api);
      syncTyped(api);
    }
  },
  methods: {
    undo: (api) => undo(api),
    clear: (api) => clear(api),
    focusInput: (api, options?: FocusOptions) => typedOf(api)?.focus(options),
  },
});
