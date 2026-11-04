import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import { hydratedAttr } from '@mintplayer/ui-core/store';
import {
  dragResize,
  keyboardResizePoint,
  toPhysicalSides,
  type PhysicalSide,
  type ResizablePositioning,
  type ResizeAction,
  type ResizeEdge,
  type ResizeUpdate,
} from './resize-math';

/**
 * A box with draggable edges (#458 M7).
 *
 *   <div class="resizable border position-relative|position-absolute" data-resizable=<id>>
 *     <style>[data-resizable=<id>] { width: …px; … }</style>   (an instance sheet)
 *     <div class="glyph top left" role="separator" aria-label="Resize from top-left corner"
 *          tabindex="0" data-resize-glyph="top start"></div>
 *     …
 *     <slot>
 *   </div>
 *
 * Each glyph is dragged with a pointer, or focused and moved with the arrow keys (10px; 1px
 * with Shift). A key press is a one-step drag, so both write the same geometry. In `inline`
 * positioning the box grows by giving back margin, so the content around it stays put; in
 * `absolute` positioning it writes its own size and offset.
 *
 * The geometry is the core's state, written as an instance sheet rather than an inline style:
 * the root's `style` belongs to the consumer, and the sheet also server-renders a preset
 * position. A glyph's `start`/`end` resolve against the host's text direction, once, and that
 * one value drives its placement class, its drag math and its accessible name.
 *
 * No-JS tier 2: the box and its content server-render (with a preset position); the glyphs,
 * which cannot work without JavaScript, are rendered only once hydrated.
 */

/**
 * Accessible names of the glyphs, keyed by the PHYSICAL edge or corner the glyph sits on (a
 * `start` glyph is on the right in a right-to-left document, and is named from the right-hand
 * entries). Pass a partial table to translate them.
 */
export interface ResizableLabels {
  top: string;
  bottom: string;
  left: string;
  right: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

export const DEFAULT_RESIZABLE_LABELS: ResizableLabels = {
  top: 'Resize from top edge',
  bottom: 'Resize from bottom edge',
  left: 'Resize from left edge',
  right: 'Resize from right edge',
  topLeft: 'Resize from top-left corner',
  topRight: 'Resize from top-right corner',
  bottomLeft: 'Resize from bottom-left corner',
  bottomRight: 'Resize from bottom-right corner',
};

/** A position and size for an absolutely positioned box, in px. */
export interface ResizablePreset {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ResizableInputs {
  positioning: ResizablePositioning;
  /** Offer the start and end glyphs. */
  horizontal: boolean;
  /** Offer the top and bottom glyphs. */
  vertical: boolean;
  /** Offer the corner glyphs (only when the box resizes both ways). */
  corners: boolean;
  /** Translations of the glyphs' names; missing keys keep the English default. */
  labels: Partial<ResizableLabels> | null;
  /** Places an absolutely positioned box, replacing any drag so far. Ignored inline. */
  presetPosition: ResizablePreset | null;
}

/** The box's written geometry, in px; null leaves the property to the stylesheets. */
export type ResizableGeometry = { readonly [K in keyof Required<ResizeUpdate>]: number | null };

export interface ResizableState {
  readonly geometry: ResizableGeometry;
  /** The host's text direction, read on attach. */
  readonly rtl: boolean;
  /** The key of the glyph being dragged. */
  readonly active: string | null;
}

export interface ResizableGlyph {
  readonly key: string;
  readonly attrs: CoreBag;
}

export interface ResizableView {
  readonly root: CoreBag;
  /** The instance sheet holding the geometry: null when nothing is written. */
  readonly css: string | null;
  /** The key the instance sheet is installed under: one per box. */
  readonly cssName: string;
  readonly glyphs: readonly ResizableGlyph[];
}

export const RESIZE_GLYPH_ATTR = 'data-resize-glyph';
const ROOT_ATTR = 'data-resizable';

const EMPTY_GEOMETRY: ResizableGeometry = {
  width: null, height: null, left: null, top: null,
  marginLeft: null, marginRight: null, marginTop: null, marginBottom: null,
};

const CSS_PROPERTY: Record<keyof ResizableGeometry, string> = {
  width: 'width', height: 'height', left: 'left', top: 'top',
  marginLeft: 'margin-left', marginRight: 'margin-right', marginTop: 'margin-top', marginBottom: 'margin-bottom',
};

/** The glyphs a box offers, as logical edge lists, in tab order. */
export function glyphEdges(inputs: Pick<ResizableInputs, 'horizontal' | 'vertical' | 'corners'>): ResizeEdge[][] {
  const corners: ResizeEdge[][] = inputs.horizontal && inputs.vertical && inputs.corners
    ? [['top', 'start'], ['top', 'end'], ['bottom', 'end'], ['bottom', 'start']]
    : [];
  const vertical: ResizeEdge[][] = inputs.vertical ? [['top'], ['bottom']] : [];
  const horizontal: ResizeEdge[][] = inputs.horizontal ? [['end'], ['start']] : [];
  return [...corners, ...vertical, ...horizontal];
}

/** The accessible name of a glyph on these physical sides. */
export function glyphLabel(sides: readonly PhysicalSide[], labels: Partial<ResizableLabels> | null): string | null {
  const table: ResizableLabels = { ...DEFAULT_RESIZABLE_LABELS, ...(labels ?? {}) };
  const v = sides.find((side) => side === 'top' || side === 'bottom');
  const h = sides.find((side) => side === 'left' || side === 'right');
  if (v && h) return table[`${v}${h === 'left' ? 'Left' : 'Right'}`];
  const side = v ?? h;
  return side ? table[side] : null;
}

/** The geometry a preset writes: its box, and no margins. Inline boxes ignore it. */
export function presetGeometry(inputs: Pick<ResizableInputs, 'positioning' | 'presetPosition'>): ResizableGeometry | null {
  const preset = inputs.presetPosition;
  if (!preset || inputs.positioning !== 'absolute') return null;
  return { ...EMPTY_GEOMETRY, left: preset.left, top: preset.top, width: preset.width, height: preset.height };
}

/** The instance sheet for one box: its written geometry, or null when there is none. */
export function geometryCss(id: string, geometry: ResizableGeometry): string | null {
  const declarations = (Object.keys(CSS_PROPERTY) as (keyof ResizableGeometry)[])
    .filter((key) => geometry[key] !== null)
    .map((key) => `${CSS_PROPERTY[key]}:${geometry[key]}px`);
  return declarations.length ? `.resizable[${ROOT_ATTR}="${id.replace(/["\\]/g, '\\$&')}"]{${declarations.join(';')}}` : null;
}

export function connectResizable(
  inputs: ResizableInputs,
  state: ResizableState,
  id: string,
  hydrated: boolean,
): ResizableView {
  return {
    root: {
      class: `resizable border ${inputs.positioning === 'absolute' ? 'position-absolute' : 'position-relative'}`,
      [ROOT_ATTR]: id,
      ...hydratedAttr(hydrated),
    },
    css: geometryCss(id, state.geometry),
    cssName: `resizable-${id}`,
    glyphs: hydrated
      ? glyphEdges(inputs).map((edges) => {
          const key = edges.join(' ');
          const sides = toPhysicalSides(edges, state.rtl);
          return {
            key,
            attrs: {
              class: ['glyph', ...sides, ...(state.active === key ? ['active'] : [])].join(' '),
              role: 'separator',
              'aria-label': glyphLabel(sides, inputs.labels),
              'aria-orientation': sides.length === 1 ? (sides[0] === 'top' || sides[0] === 'bottom' ? 'horizontal' : 'vertical') : null,
              tabindex: '0',
              [RESIZE_GLYPH_ATTR]: key,
            },
          };
        })
      : [],
  };
}

/** The glyph an event came from, if it is one of this box's own (a nested box has its own). */
function glyphOf(target: EventTarget | null, host: HTMLElement): HTMLElement | null {
  const el = target as Element | null;
  const glyph = el?.closest?.<HTMLElement>(`[${RESIZE_GLYPH_ATTR}]`) ?? null;
  return glyph && glyph.closest(`[${ROOT_ATTR}]`) === host ? glyph : null;
}

/** The geometry a resize starts from, measured off the host. */
function captureAction(host: HTMLElement, positioning: ResizablePositioning, sides: readonly PhysicalSide[]): ResizeAction {
  const rect = host.getBoundingClientRect();
  const styles = host.ownerDocument.defaultView?.getComputedStyle(host);
  // An unset margin computes to '' in some engines: treat it as 0, never NaN.
  const px = (value: string | undefined) => parseFloat(value ?? '') || 0;
  return {
    positioning,
    sides,
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    offset: { left: host.offsetLeft, top: host.offsetTop },
    margin: {
      left: px(styles?.marginLeft),
      right: px(styles?.marginRight),
      top: px(styles?.marginTop),
      bottom: px(styles?.marginBottom),
    },
  };
}

export const resizableCore = defineCore<
  ResizableInputs,
  ResizableState,
  { view: ResizableView },
  { resized: ResizableGeometry }
>({
  state: (inputs) => ({ geometry: presetGeometry(inputs) ?? EMPTY_GEOMETRY, rtl: false, active: null }),
  view: ({ inputs, state, id, hydrated }) => ({ view: connectResizable(inputs, state, id, hydrated) }),
  attach: (api) => {
    const host = api.host;
    const doc = host.ownerDocument;
    api.setState({ rtl: doc.defaultView?.getComputedStyle(host).direction === 'rtl' });

    const sidesOf = (glyph: HTMLElement) =>
      toPhysicalSides((glyph.getAttribute(RESIZE_GLYPH_ATTR) ?? '').split(' ').filter(Boolean) as ResizeEdge[], api.state().rtl);
    const apply = (update: ResizeUpdate) =>
      api.setState({ geometry: { ...api.state().geometry, ...update } });

    let drag: { pointerId: number; action: ResizeAction } | null = null;

    const onPointerMove = (ev: PointerEvent) => {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      ev.preventDefault();
      apply(dragResize(drag.action, ev.clientX, ev.clientY));
    };
    const stop = () => {
      doc.removeEventListener('pointermove', onPointerMove);
      doc.removeEventListener('pointerup', onPointerUp);
      doc.removeEventListener('pointercancel', onPointerUp);
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      drag = null;
      stop();
      api.setState({ active: null });
      api.emit('resized', api.state().geometry);
    };
    // No preventDefault on a touch pointerdown: `touch-action: none` on the glyph is what
    // stops the page from scrolling, and pointer capture keeps the drag off the glyph.
    const onPointerDown = (ev: PointerEvent) => {
      const glyph = glyphOf(ev.target, host);
      if (!glyph || ev.button !== 0 || drag) return;
      if (ev.pointerType === 'mouse') ev.preventDefault();
      drag = { pointerId: ev.pointerId, action: captureAction(host, api.inputs().positioning, sidesOf(glyph)) };
      try {
        glyph.setPointerCapture?.(ev.pointerId);
      } catch {
        // An untrusted or synthetic pointer cannot be captured; the document listeners still follow it.
      }
      doc.addEventListener('pointermove', onPointerMove);
      doc.addEventListener('pointerup', onPointerUp);
      doc.addEventListener('pointercancel', onPointerUp);
      api.setState({ active: glyph.getAttribute(RESIZE_GLYPH_ATTR) });
    };

    // A key press is a one-step drag of the glyph's own edge: 10px, 1px with Shift.
    const onKeydown = (ev: KeyboardEvent) => {
      const glyph = glyphOf(ev.target, host);
      if (!glyph || ev.target !== glyph) return;
      const action = captureAction(host, api.inputs().positioning, sidesOf(glyph));
      const point = keyboardResizePoint(action, ev.key, ev.shiftKey ? 1 : 10);
      if (!point) return;
      ev.preventDefault();
      apply(dragResize(action, point.x, point.y));
      api.emit('resized', api.state().geometry);
    };

    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('keydown', onKeydown);
    return () => {
      stop();
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('keydown', onKeydown);
    };
  },
  inputsChanged: (api, prev) => {
    const next = api.inputs();
    if (next.presetPosition === prev.presetPosition && next.positioning === prev.positioning) return;
    const geometry = presetGeometry(next);
    if (geometry) api.setState({ geometry });
  },
});
