import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import {
  SPLITTER_LABELS,
  SPLITTER_PANELS,
  connectSplitter,
  connectSplitterPanel,
  dividerValues,
  dragSizes,
  keySizes,
  parseSplitterOrientation,
  rescaleSizes,
  splitterLabel,
  type SplitterLabels,
  type SplitterOrientation,
  type SplitterPanelView,
  type SplitterPanelsContext,
  type SplitterResizeEventDetail,
  type SplitterResizeKey,
  type SplitterView,
} from './splitter';

/**
 * The splitter's cores (PRD #437 D10): what the generated Angular, React, Vue
 * and Lit components host. `splitter.component.ts` is the manifest and
 * `templates/` the markup.
 *
 * Pointer drags and the keyboard share one path: both produce new pixel sizes,
 * which are written onto the panes' inline size and mirrored onto the
 * dividers' value attributes. The splitter re-reads its panels whenever its
 * own children change, so panels added or removed by the framework are picked
 * up without the panels reporting in.
 */
export interface SplitterInputs {
  orientation: SplitterOrientation;
  /** The smallest a divider can make a panel, in px. */
  minPanelSize: number;
  /** Widen the dividers' hit area for touch. */
  touchMode: boolean;
  labels?: Partial<SplitterLabels> | null;
}

export interface SplitterState {
  resizing: boolean;
}

export interface SplitterEvents {
  resizeStart: SplitterResizeEventDetail;
  resizing: SplitterResizeEventDetail;
  resizeEnd: SplitterResizeEventDetail;
}

export interface SplitterMethods {
  /** The panel sizes in px, in document order (empty before the first measurement). */
  getPanelSizes(): number[];
  /** Set the panel sizes in px, one per panel. Silent: no event. */
  setPanelSizes(sizes: number[]): void;
  /** Move divider `dividerIndex` (between panel `dividerIndex` and the next) as its key would; `fine` is Shift. */
  resizeDividerBy(dividerIndex: number, key: SplitterResizeKey, fine?: boolean): void;
}

type Api = CoreApi<SplitterInputs, SplitterState, SplitterEvents>;

const DEFAULT_MIN = 50;
const minOf = (inputs: Readonly<SplitterInputs>): number => {
  const min = Number(inputs.minPanelSize);
  return Number.isFinite(min) && min >= 0 ? min : DEFAULT_MIN;
};
const labelsOf = (inputs: Readonly<SplitterInputs>): SplitterLabels => ({ ...SPLITTER_LABELS, ...inputs.labels });

interface Engine {
  sizes(): number[];
  setSizes(sizes: number[]): void;
  key(dividerIndex: number, key: string, fine: boolean): boolean;
  inputsChanged(prev: Readonly<SplitterInputs>): void;
}
const engines = new WeakMap<HTMLElement, Engine>();

interface Drag {
  readonly pointerId: number;
  readonly index: number;
  readonly start: number;
  readonly sizes: readonly number[];
  readonly divider: HTMLElement;
  preview: number[] | null;
}

export const splitterCore = defineCore<
  SplitterInputs,
  SplitterState,
  { view: SplitterView },
  SplitterEvents,
  undefined,
  SplitterPanelsContext,
  SplitterMethods
>({
  provides: SPLITTER_PANELS,
  state: () => ({ resizing: false }),
  view: ({ inputs, state, hydrated }) => ({
    view: connectSplitter({
      orientation: parseSplitterOrientation(inputs.orientation),
      touchMode: !!inputs.touchMode,
      resizing: state.resizing,
      hydrated,
    }),
  }),
  provide: ({ inputs }) => ({ orientation: parseSplitterOrientation(inputs.orientation) }),
  attach: (api: Api) => {
    const root = api.host;
    const doc = root.ownerDocument;
    const view = doc.defaultView;
    const orientation = () => parseSplitterOrientation(api.inputs().orientation);
    const horizontal = () => orientation() === 'horizontal';
    const dim = () => (horizontal() ? 'width' : 'height');

    /** Our own panels' parts, never a nested splitter's. */
    const panels = () => [...root.children].filter((el): el is HTMLElement => el.classList.contains('splitter-panel'));
    const panes = () => panels().flatMap((panel) => [...panel.children].filter((el): el is HTMLElement => el.classList.contains('splitter-pane')));
    const dividerOf = (panel: HTMLElement) =>
      [...panel.children].find((el): el is HTMLElement => el.classList.contains('splitter-divider')) ?? null;
    /** Divider k separates pane k and pane k + 1: it is the divider of panel k + 1. */
    const dividers = () => panels().slice(1).map(dividerOf);
    const ownDivider = (target: EventTarget | null): HTMLElement | null => {
      const divider = target instanceof Element ? target.closest<HTMLElement>('.splitter-divider') : null;
      return divider && divider.parentElement?.parentElement === root ? divider : null;
    };
    const total = () => root.getBoundingClientRect()[dim()];
    const detail = (sizes: number[]): SplitterResizeEventDetail => ({ sizes: [...sizes], orientation: orientation() });

    let sizes: number[] = [];
    let drag: Drag | null = null;
    let frame = 0;

    const apply = (next: readonly number[]) => {
      const property = dim();
      const other = horizontal() ? 'height' : 'width';
      panes().forEach((pane, k) => {
        if (next[k] === undefined) return;
        pane.style.setProperty('flex', '0 1 auto');
        pane.style.setProperty(property, `${next[k]}px`);
        pane.style.removeProperty(other);
      });
    };

    const clearApplied = () =>
      panes().forEach((pane) => ['flex', 'width', 'height'].forEach((property) => pane.style.removeProperty(property)));

    /** Names, `aria-controls` and value attributes: what depends on a divider's neighbours. */
    const describe = () => {
      const list = panes();
      const labels = labelsOf(api.inputs());
      const current = drag?.preview ?? sizes;
      const size = total();
      const min = minOf(api.inputs());
      const first = panels()[0];
      const firstDivider = first ? dividerOf(first) : null;
      ['aria-controls', 'aria-label', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext'].forEach((name) =>
        firstDivider?.removeAttribute(name),
      );
      dividers().forEach((divider, k) => {
        if (!divider) return;
        const ids = [list[k]?.id, list[k + 1]?.id].filter(Boolean).join(' ');
        if (ids) divider.setAttribute('aria-controls', ids);
        divider.setAttribute('aria-label', splitterLabel(labels.divider, { before: k + 1, after: k + 2 }));
        const values = current.length === list.length ? dividerValues(current, k, size, min) : null;
        Object.entries(values ?? {}).forEach(([name, value]) => divider.setAttribute(name, String(value)));
      });
    };

    const measure = () => panes().map((pane) => pane.getBoundingClientRect()[dim()]);

    /** The space the panes share: the splitter minus its dividers and the panes' overlap margins. */
    const available = () => {
      const property = dim();
      const [start, end] = horizontal() ? (['marginLeft', 'marginRight'] as const) : (['marginTop', 'marginBottom'] as const);
      const dividerTotal = dividers().reduce((sum, divider) => sum + (divider?.getBoundingClientRect()[property] ?? 0), 0);
      const marginTotal = panes().reduce((sum, pane) => {
        const style = view?.getComputedStyle(pane);
        return sum + (parseFloat(style?.[start] ?? '') || 0) + (parseFloat(style?.[end] ?? '') || 0);
      }, 0);
      return total() - dividerTotal - marginTotal;
    };

    const rescale = () => {
      if (drag || sizes.length === 0 || sizes.length !== panes().length || total() <= 0) return;
      const next = rescaleSizes(sizes, available());
      if (next) {
        sizes = next;
        apply(sizes);
      }
      describe();
    };

    /** Pin the measured layout once panes exist, or re-apply the stored sizes when the count still matches. */
    const sync = () => {
      frame = 0;
      const count = panes().length;
      if (count === 0) return;
      if (sizes.length === count) {
        apply(sizes);
        rescale();
        return;
      }
      const measured = measure();
      // Layout has not run for these panes yet: writing 0px would collapse them.
      if (measured.every((size) => size <= 0)) {
        describe();
        return;
      }
      sizes = measured;
      apply(sizes);
      describe();
    };

    const schedule = () => {
      if (frame || !view) return;
      frame = view.requestAnimationFrame(sync);
    };

    const setSizes = (next: number[]) => {
      sizes = [...next];
      if (sizes.length === panes().length) apply(sizes);
      describe();
      // Sizes from outside often fill the whole splitter, dividers included.
      schedule();
    };

    /* ----- pointer ----- */

    const axis = (ev: PointerEvent | MouseEvent) => (horizontal() ? ev.clientX : ev.clientY);

    const onPointerMove = (ev: PointerEvent) => {
      if (!drag || (ev.pointerId !== undefined && ev.pointerId !== drag.pointerId)) return;
      ev.preventDefault();
      drag.preview = dragSizes(drag.sizes, drag.index, axis(ev) - drag.start, minOf(api.inputs()));
      apply(drag.preview);
      describe();
      api.emit('resizing', detail(drag.preview));
    };

    const endDrag = () => {
      if (!drag) return;
      const done = drag;
      drag = null;
      doc.removeEventListener('pointermove', onPointerMove);
      doc.removeEventListener('pointerup', onPointerUp);
      doc.removeEventListener('pointercancel', onPointerUp);
      done.divider.removeAttribute('data-active');
      sizes = [...(done.preview ?? done.sizes)];
      api.setState({ resizing: false });
      describe();
      api.emit('resizeEnd', detail(sizes));
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (!drag || (ev.pointerId !== undefined && ev.pointerId !== drag.pointerId)) return;
      endDrag();
    };

    const onPointerDown = (ev: PointerEvent) => {
      const divider = ownDivider(ev.target);
      if (!divider || drag || ev.button > 0) return;
      const index = dividers().indexOf(divider);
      if (index < 0) return;
      ev.preventDefault();
      const measured = measure();
      drag = { pointerId: ev.pointerId, index, start: axis(ev), sizes: measured, divider, preview: null };
      try {
        divider.setPointerCapture?.(ev.pointerId);
      } catch {
        // An untrusted or synthetic pointer cannot be captured; the document listeners still follow it.
      }
      divider.setAttribute('data-active', '');
      doc.addEventListener('pointermove', onPointerMove);
      doc.addEventListener('pointerup', onPointerUp);
      doc.addEventListener('pointercancel', onPointerUp);
      api.setState({ resizing: true });
      api.emit('resizeStart', detail(measured));
    };

    /* ----- keyboard ----- */

    const key = (index: number, name: string, fine: boolean): boolean => {
      const list = panes();
      if (sizes.length !== list.length) return false;
      const divider = dividers()[index];
      if (!divider) return false;
      const next = keySizes(sizes, index, name, { orientation: orientation(), total: total(), min: minOf(api.inputs()), fine });
      if (!next) return false;
      sizes = next;
      apply(sizes);
      describe();
      divider.setAttribute('data-active', '');
      queueMicrotask(() => divider.removeAttribute('data-active'));
      api.emit('resizeEnd', detail(sizes));
      return true;
    };

    const onKeydown = (ev: KeyboardEvent) => {
      const divider = ownDivider(ev.target);
      if (!divider || ev.target !== divider) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(ev.key)) return;
      ev.preventDefault();
      key(dividers().indexOf(divider), ev.key, ev.shiftKey);
    };

    /* ----- wiring ----- */

    // Our own children only: a pane's content changing is none of our business.
    const mutations =
      typeof MutationObserver === 'undefined'
        ? undefined
        : new MutationObserver((records) => {
            if (records.some((record) => record.target === root || (record.target as Node).parentNode === root)) schedule();
          });
    mutations?.observe(root, { childList: true, subtree: true });

    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => rescale());
    resize?.observe(root);

    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('keydown', onKeydown);

    engines.set(root, {
      sizes: () => [...sizes],
      setSizes,
      key,
      inputsChanged: (prev) => {
        const next = api.inputs();
        if (parseSplitterOrientation(next.orientation) !== parseSplitterOrientation(prev.orientation)) {
          // The other axis: forget the pixel sizes and measure afresh.
          endDrag();
          sizes = [];
          clearApplied();
          schedule();
          return;
        }
        if (next.labels !== prev.labels || next.minPanelSize !== prev.minPanelSize) describe();
      },
    });

    schedule();

    return () => {
      // A drag cut short by removal commits what the user saw, and pairs its resizeStart.
      endDrag();
      if (frame) view?.cancelAnimationFrame(frame);
      mutations?.disconnect();
      resize?.disconnect();
      engines.delete(root);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('keydown', onKeydown);
    };
  },
  inputsChanged: (api, prev) => engines.get(api.host)?.inputsChanged(prev),
  methods: {
    getPanelSizes: (api) => engines.get(api.host)?.sizes() ?? [],
    setPanelSizes: (api, sizes) => engines.get(api.host)?.setSizes(sizes),
    resizeDividerBy: (api, dividerIndex, key, fine = false) => {
      engines.get(api.host)?.key(dividerIndex, key, fine);
    },
  },
});

export const splitterPanelCore = defineCore<object, object, { view: SplitterPanelView }, Record<never, never>, SplitterPanelsContext>({
  consume: SPLITTER_PANELS,
  view: ({ context, id, hydrated }) => ({
    view: connectSplitterPanel({ id, orientation: context.orientation, hydrated }),
  }),
});
