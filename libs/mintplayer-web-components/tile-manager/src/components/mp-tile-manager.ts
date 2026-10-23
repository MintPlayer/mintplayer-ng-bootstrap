import { LitElement, css, html, type PropertyValues, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { adoptLightStyles, installLightStyles } from '@mintplayer/web-components/light-dom';
import { MachineController, props } from '@mintplayer/web-components/machine';
import {
  connect,
  DEFAULT_GAP,
  DEFAULT_MIN_COLUMN_WIDTH,
  gridPointer,
  readCellMetrics,
  TILE_MANAGER_SCOPE,
  TileFlip,
  TileManagerMachine,
  tileManagerScopedStyles,
  type MintTile,
  type TileBreakpoint,
  type TileDragMode,
  type TileLayouts,
  type TileLayoutSnapshot,
  type TileManagerInputPatch,
  type TileManagerMessages,
  type TileManagerState,
  type TilePart,
  type TileResizeMode,
  type TileView,
} from '@mintplayer/ui-core/tile-manager';

/** Inputs forwarded to the machine one-to-one; `animateReflow` is the front's own. */
const MACHINE_INPUTS = [
  'tiles', 'layouts', 'breakpoints', 'stackBelow', 'maxColumns', 'minColumnWidth', 'minRowHeight',
  'gap', 'dragMode', 'resizeMode', 'label', 'messages',
] as const;

let nextBoardId = 0;

/**
 * `<mp-tile-manager>`: the Lit front of `TileManagerMachine` (#440). Every decision (layout per
 * column count, gestures, keyboard, ARIA) is the machine's; this element measures the grid,
 * renders `connect()`'s bags, owns pointer capture and the FLIP animation, and re-dispatches the
 * machine's events (`layoutchange`, `layoutpreview`, `columncountchange`, `gestureblocked`).
 *
 * Keeps its shadow root: tile content arrives only through the named slots `${id}-header` and
 * `${id}-content`, so it is never starved of page CSS (light-tier admission rule). The scoped
 * sheet is adopted into the shadow root.
 *
 * No-JS: Tier 2. Before the first measure the tiles render as named groups with no tab stop,
 * grips or instructions.
 */
export class MintTileManagerElement extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
  `;

  static override properties = {
    tiles: { attribute: false },
    layouts: { attribute: false },
    breakpoints: { attribute: false },
    stackBelow: { type: Number, attribute: 'stack-below' },
    maxColumns: { type: Number, attribute: 'max-columns' },
    minColumnWidth: { type: Number, attribute: 'min-column-width' },
    minRowHeight: { type: String, attribute: 'min-row-height' },
    gap: { type: Number },
    dragMode: { type: String, attribute: 'drag-mode', reflect: true },
    resizeMode: { type: String, attribute: 'resize-mode', reflect: true },
    animateReflow: { type: Boolean, attribute: 'animate-reflow' },
    label: { type: String },
    messages: { attribute: false },
  };

  tiles: readonly MintTile[] = [];
  /** Per column count; two-way through `layoutchange`'s `layouts`. */
  layouts: TileLayouts = {};
  breakpoints: readonly TileBreakpoint[] | null = null;
  stackBelow: number | null = null;
  maxColumns = 6;
  /** px */
  minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH;
  minRowHeight = '8rem';
  /** px */
  gap = DEFAULT_GAP;
  dragMode: TileDragMode = 'header';
  resizeMode: TileResizeMode = 'hover';
  animateReflow = true;
  label: string | null = null;
  messages: Partial<TileManagerMessages> = {};

  readonly machine = new TileManagerMachine({ vibrate: (ms) => navigator.vibrate?.(ms) });
  readonly #ctl = new MachineController<TileManagerMachine, TileManagerState>(this, this.machine);
  readonly #rootId = `mp-tile-manager-${++nextBoardId}`;
  readonly #flip = new TileFlip();
  #flipPending = false;
  #lastRendered: TileLayoutSnapshot | null = null;
  #focusSeq = 0;
  #resizeObserver: ResizeObserver | null = null;
  #measureFrame = 0;
  #width = 0;
  #releaseStyles: (() => void) | null = null;
  readonly #onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') this.machine.cancelGesture();
  };

  constructor() {
    super();
    // FLIP "first": read in the notification, before Lit writes the new positions.
    this.machine.subscribe(() => {
      const rendered = this.machine.rendered;
      if (rendered === this.#lastRendered) return;
      this.#lastRendered = rendered;
      const grid = this.#grid;
      if (grid && this.animateReflow && this.machine.snapshot.measured) {
        this.#flip.first(grid);
        this.#flipPending = true;
      }
    });
    this.machine.onEvent((e) => {
      const { type, ...detail } = e;
      this.dispatchEvent(new CustomEvent(type, { detail, bubbles: false, composed: true }));
    });
  }

  /** What is rendered: the resolved column count and its layout (the preview while editing). */
  captureLayout(): { columnCount: number; layout: TileLayoutSnapshot } {
    return { columnCount: this.machine.snapshot.columnCount, layout: this.machine.rendered.map((p) => ({ id: p.id, position: { ...p.position } })) };
  }

  /** Drops `layouts[count]` and commits, so that count derives again (D15). */
  resetLayout(count: number): void {
    this.machine.resetLayout(count);
  }

  /** True while a pointer drag or resize is in flight. */
  get isGestureActive(): boolean {
    const kind = this.machine.snapshot.gesture.kind;
    return kind === 'drag' || kind === 'resize';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.renderRoot instanceof ShadowRoot) {
      this.#releaseStyles?.();
      this.#releaseStyles = adoptLightStyles(this.renderRoot);
    }
    document.addEventListener('visibilitychange', this.#onVisibilityChange);
    if (this.hasUpdated) this.#observe();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#releaseStyles?.();
    this.#releaseStyles = null;
    document.removeEventListener('visibilitychange', this.#onVisibilityChange);
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    cancelAnimationFrame(this.#measureFrame);
    this.#measureFrame = 0;
    this.machine.cancelGesture();
  }

  get #grid(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.tile-grid');
  }

  // Forward only the inputs that changed: an update the machine itself requested must not
  // re-push a stale controlled `layouts` over the layout it just committed (S3).
  protected override willUpdate(changed: PropertyValues<this>): void {
    const keys = MACHINE_INPUTS.filter((k) => changed.has(k));
    if (keys.length) this.machine.setInputs(Object.fromEntries(keys.map((k) => [k, this[k]])) as TileManagerInputPatch);
  }

  protected override firstUpdated(): void {
    this.#observe();
  }

  protected override updated(): void {
    const s = this.machine.snapshot;
    const grid = this.#grid;
    if (this.#flipPending && grid) {
      this.#flipPending = false;
      this.#flip.play(grid, s.gesture.kind === 'drag' ? s.gesture.tileId : null);
    }
    if (s.focusRequest && s.focusRequest.seq !== this.#focusSeq) {
      this.#focusSeq = s.focusRequest.seq;
      this.renderRoot.querySelector<HTMLElement>(`[data-tile-id="${CSS.escape(s.focusRequest.tileId)}"]`)?.focus();
    }
  }

  // One observer on the grid; `measure` runs in the next frame, never inside the callback (S2).
  #observe(): void {
    const grid = this.#grid;
    if (!grid || this.#resizeObserver || typeof ResizeObserver === 'undefined') return;
    this.#resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      this.#width = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      if (this.#measureFrame) return;
      this.#measureFrame = requestAnimationFrame(() => {
        this.#measureFrame = 0;
        this.machine.measure(this.#width);
      });
    });
    this.#resizeObserver.observe(grid);
  }

  #down(e: PointerEvent, id: string, part: TilePart): void {
    const grid = this.#grid;
    if (!grid) return;
    const verdict = this.machine.pointerDown(id, part, gridPointer(e, grid), readCellMetrics(grid, this.machine.snapshot.columnCount));
    if (verdict === 'capture') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-tile-id]')?.setPointerCapture(e.pointerId);
    }
  }

  #move(e: PointerEvent): void {
    const grid = this.#grid;
    if (grid && this.machine.pointerMove(gridPointer(e, grid)) === 'capture') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  #key(e: KeyboardEvent, id: string): void {
    if (this.machine.keydown(id, e.key, { shift: e.shiftKey })) e.preventDefault();
  }

  #tile(t: TileView): TemplateResult {
    // A press on the header or a grip bubbles to the tile's 'body' handler; the machine ignores
    // that second pointerdown for the same pointer, so the innermost part decides.
    return html`<div class="tile" ${props(t.attrs)} style=${styleMap(t.style)}
        @pointerdown=${(e: PointerEvent) => this.#down(e, t.id, 'body')}
        @pointermove=${(e: PointerEvent) => this.#move(e)}
        @pointerup=${(e: PointerEvent) => this.machine.pointerUp(e)}
        @pointercancel=${(e: PointerEvent) => this.machine.pointerCancel(e)}
        @lostpointercapture=${(e: PointerEvent) => this.machine.pointerCancel(e)}
        @keydown=${(e: KeyboardEvent) => this.#key(e, t.id)}
        @focus=${() => this.machine.focus(t.id)}
        @blur=${() => this.machine.blur(t.id)}>
      <div class="tile-header" ${props(t.header)} @pointerdown=${(e: PointerEvent) => this.#down(e, t.id, 'header')}>
        <slot name=${`${t.id}-header`}></slot>
      </div>
      <div class="tile-content" ${props(t.content)}><slot name=${`${t.id}-content`}></slot></div>
      ${t.grips.map((g) => html`<span class="tile-grip" ${props(g.attrs)}
          @pointerdown=${(e: PointerEvent) => this.#down(e, t.id, g.handle)}></span>`)}
    </div>`;
  }

  override render(): TemplateResult {
    const api = connect(this.#ctl.machine, this.#rootId);
    return html`<div class="mp-tile-manager" ${props(api.board.attrs)} style=${styleMap(api.board.style)}>
      <div class="tile-container" ${props(api.container)}>
        <div class="tile-grid" ${props(api.grid.attrs)} style=${styleMap(api.grid.style)}>
          ${repeat(api.tiles, (t) => t.id, (t) => this.#tile(t))}
        </div>
      </div>
      ${repeat(api.descriptions, (n) => n.key, (n) => html`<div class="tile-sr-only" ${props(n.attrs)}>${n.text}</div>`)}
      <span class="tile-sr-only" ${props(api.live.attrs)}>${api.live.text}</span>
    </div>`;
  }
}

installLightStyles(TILE_MANAGER_SCOPE, tileManagerScopedStyles);

if (typeof customElements !== 'undefined' && !customElements.get('mp-tile-manager')) {
  customElements.define('mp-tile-manager', MintTileManagerElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-tile-manager': MintTileManagerElement;
  }
}
