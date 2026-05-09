import { LitElement, html, type TemplateResult, type PropertyValues, nothing } from 'lit';
import { TilePosition } from '../types/tile-position';
import { TileLayoutSnapshot, TileGestureBlocked } from '../types/tile-layout-snapshot';
import { GridRect } from '../types/grid-rect';
import { pack } from '../utils/pack';
import { styles } from './mint-tile-manager.element.template';

export interface MintTile {
  id: string;
  position: TilePosition;
  disableMove: boolean;
  disableResize: boolean;
  label: string | null;
}

export type TileDragMode = 'tile' | 'header' | 'off';
export type TileResizeMode = 'hover' | 'always' | 'off';

type GestureState =
  | { kind: 'idle' }
  | {
      kind: 'arming-touch-drag';
      pointerId: number;
      tileId: string;
      startX: number;
      startY: number;
      timer: number | null;
      pressingTimer: number | null;
    }
  | {
      kind: 'drag';
      pointerId: number;
      tileId: string;
      pointerOffset: { dx: number; dy: number };
      currentRect: GridRect;
      blocked: boolean;
    }
  | {
      kind: 'resize';
      pointerId: number;
      tileId: string;
      mode: 'side' | 'bottom' | 'corner';
      startPointer: { x: number; y: number };
      startSpans: { colSpan: number; rowSpan: number };
      currentRect: GridRect;
      blocked: boolean;
    };

type KeyboardMode =
  | { kind: 'idle' }
  | { kind: 'move'; tileId: string }
  | { kind: 'resize'; tileId: string };

const TOUCH_LONG_PRESS_MS = 600;
const TOUCH_LONG_PRESS_SLOP_PX = 10;
const TOUCH_PRESS_FEEDBACK_DELAY_MS = 150;
const POINTER_DRAG_THRESHOLD_PX = 5;

export class MintTileManagerElement extends LitElement {
  static override styles = [styles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'column-count',
      'min-column-width',
      'min-row-height',
      'gap',
      'drag-mode',
      'resize-mode',
      'animate-reflow',
      'label',
    ];
  }

  static override properties = {
    tiles: { attribute: false },
    columnCount: { attribute: 'column-count', type: Number },
    minColumnWidth: { attribute: 'min-column-width', type: String },
    minRowHeight: { attribute: 'min-row-height', type: String },
    gap: { attribute: 'gap', type: String },
    dragMode: { attribute: 'drag-mode', type: String, reflect: true },
    resizeMode: { attribute: 'resize-mode', type: String, reflect: true },
    animateReflow: { attribute: 'animate-reflow', type: Boolean },
    label: { attribute: 'label', type: String },
    previewLayout: { state: true },
    gestureKind: { state: true },
    blocked: { state: true },
    effectiveColumnCount: { state: true },
    keyboardMode: { state: true },
    liveRegionMessage: { state: true },
  };

  tiles: ReadonlyArray<MintTile> = [];
  columnCount: number | null = null;
  minColumnWidth = '200px';
  minRowHeight = '8rem';
  gap = '0.5rem';
  dragMode: TileDragMode = 'header';
  resizeMode: TileResizeMode = 'hover';
  animateReflow = true;
  label: string | null = null;

  private gestureState: GestureState = { kind: 'idle' };
  private keyboardState: KeyboardMode = { kind: 'idle' };

  // State-tracked redraw triggers (Lit re-renders when these change).
  protected previewLayout: TileLayoutSnapshot | null = null;
  protected gestureKind: GestureState['kind'] = 'idle';
  protected blocked = false;
  protected effectiveColumnCount = 1;
  protected liveRegionMessage = '';

  private hostResizeObserver: ResizeObserver | null = null;
  private flipPreviousRects: Map<string, DOMRect> = new Map();

  // Cached layout metrics. Refreshed lazily in updated()/firstUpdated() and on
  // ResizeObserver ticks — never from render(), so the per-tile pointer-move
  // path stays free of getComputedStyle / getBoundingClientRect calls.
  private cellMetrics = { width: 0, height: 0, gapX: 0, gapY: 0 };

  // Bound handlers — created once so add/remove pair correctly.
  private readonly onWindowPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
  private readonly onWindowPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
  private readonly onWindowPointerCancel = (e: PointerEvent) => this.handlePointerCancel(e);
  private readonly onWindowKeyDown = (e: KeyboardEvent) => this.handleEscapeKey(e);
  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') this.cancelGesture();
  };

  override render(): TemplateResult {
    const layoutSource = this.previewLayout ?? this.tiles.map((t) => ({ id: t.id, position: t.position }));
    const tileById = new Map(this.tiles.map((t) => [t.id, t]));

    const gridStyle = this.computeGridStyle();

    // ARIA grid hierarchy is grid > row > gridcell. A single role="row"
    // wrapper with display: contents lets us satisfy that without disturbing
    // the CSS Grid placement of the gridcell children.
    return html`
      <div class="tile-grid" role="grid" aria-label=${this.label ?? nothing} style=${gridStyle}>
        <div role="row" style="display: contents;">
          ${layoutSource.map((entry) => {
            const tile = tileById.get(entry.id);
            if (!tile) return nothing;
            return this.renderTile(tile, entry.position);
          })}
        </div>
      </div>
      <div class="tile-grid__live-region" aria-live="polite" aria-atomic="true">${this.liveRegionMessage}</div>
    `;
  }

  private renderTile(tile: MintTile, pos: TilePosition): TemplateResult {
    const isDragging = this.gestureKind === 'drag' && this.activeTileId() === tile.id;
    const isResizing = this.gestureKind === 'resize' && this.activeTileId() === tile.id;
    const isBlocked = (isDragging || isResizing) && this.blocked;
    const isPressing = this.gestureKind === 'arming-touch-drag' && this.activeTileId() === tile.id;
    const transform = this.computeActiveTransform(tile.id);

    const style = [
      `grid-column: ${pos.colStart} / span ${pos.colSpan}`,
      `grid-row: ${pos.rowStart} / span ${pos.rowSpan}`,
      transform ? `transform: ${transform}` : '',
    ]
      .filter(Boolean)
      .join('; ');

    return html`
      <div
        class="tile"
        role="gridcell"
        tabindex="0"
        data-tile-id=${tile.id}
        data-dragging=${isDragging ? 'true' : 'false'}
        data-resizing=${isResizing ? 'true' : 'false'}
        data-blocked=${isBlocked ? 'true' : 'false'}
        data-pressing=${isPressing ? 'true' : 'false'}
        data-drag-mode=${this.dragMode}
        data-locked-move=${tile.disableMove ? 'true' : 'false'}
        data-locked-resize=${tile.disableResize ? 'true' : 'false'}
        aria-label=${tile.label ?? nothing}
        style=${style}
        @pointerdown=${(e: PointerEvent) => this.onTilePointerDown(e, tile)}
        @keydown=${(e: KeyboardEvent) => this.onTileKeyDown(e, tile)}
      >
        <div class="tile__header-shell">
          <slot name=${`${tile.id}-header`}></slot>
        </div>
        <div class="tile__content-shell">
          <slot name=${`${tile.id}-content`}></slot>
        </div>
        ${tile.disableResize || this.resizeMode === 'off'
          ? nothing
          : html`
              <div class="tile__resize-side" data-resize="side"
                   @pointerdown=${(e: PointerEvent) => this.onResizeHandlePointerDown(e, tile, 'side')}></div>
              <div class="tile__resize-bottom" data-resize="bottom"
                   @pointerdown=${(e: PointerEvent) => this.onResizeHandlePointerDown(e, tile, 'bottom')}></div>
              <div class="tile__resize-corner" data-resize="corner"
                   @pointerdown=${(e: PointerEvent) => this.onResizeHandlePointerDown(e, tile, 'corner')}></div>
            `}
      </div>
    `;
  }

  private computeGridStyle(): string {
    const tracks =
      this.columnCount && this.columnCount > 0
        ? `repeat(${this.columnCount}, minmax(0, 1fr))`
        : `repeat(auto-fit, minmax(${this.minColumnWidth}, 1fr))`;
    return [
      `grid-template-columns: ${tracks}`,
      `--mp-tile-row-height: ${this.minRowHeight}`,
      `--mp-tile-gap: ${this.gap}`,
    ].join('; ');
  }

  /**
   * Refresh the cached layout metrics by reading layout / computed-style state
   * once. Called from firstUpdated, the ResizeObserver tick, and updated()
   * when an input that affects metrics changes — never from render().
   */
  private updateLayoutCache(): void {
    const grid = this.shadowRoot?.querySelector<HTMLElement>('.tile-grid');
    if (!grid) {
      this.effectiveColumnCount =
        this.columnCount && this.columnCount > 0 ? this.columnCount : 1;
      return;
    }
    const cs = getComputedStyle(grid);
    if (this.columnCount && this.columnCount > 0) {
      this.effectiveColumnCount = this.columnCount;
    } else {
      const tracks = cs.gridTemplateColumns.split(/\s+/).filter(Boolean);
      this.effectiveColumnCount = Math.max(1, tracks.length);
    }
    const rect = grid.getBoundingClientRect();
    const cols = this.effectiveColumnCount;
    const gapX = parseFloat(cs.columnGap) || 0;
    const gapY = parseFloat(cs.rowGap) || 0;
    const width = (rect.width - (cols - 1) * gapX) / cols;
    const height = parseFloat(cs.gridAutoRows) || rect.width / cols;
    this.cellMetrics = { width, height, gapX, gapY };
  }

  private computeActiveTransform(id: string): string | null {
    const g = this.gestureState;
    if (g.kind !== 'drag' || g.tileId !== id) return null;
    const pointer = this.lastPointerPosition;
    if (!pointer) return null;
    const grid = this.shadowRoot?.querySelector<HTMLElement>('.tile-grid');
    if (!grid) return null;
    // Cached cellMetrics is stale by at most one frame after a resize — fine
    // for the visual translate. gridRect read here is unavoidable: we need
    // the live grid origin to convert pointer (viewport coords) into
    // grid-relative space. One read per render, not one per tile.
    const gridRect = grid.getBoundingClientRect();
    const cell = this.cellMetrics;
    const snapped = g.currentRect;
    const desiredLeft = pointer.x - gridRect.left - g.pointerOffset.dx;
    const desiredTop = pointer.y - gridRect.top - g.pointerOffset.dy;
    const snappedLeft = (snapped.colStart - 1) * (cell.width + cell.gapX);
    const snappedTop = (snapped.rowStart - 1) * (cell.height + cell.gapY);
    return `translate(${Math.round(desiredLeft - snappedLeft)}px, ${Math.round(desiredTop - snappedTop)}px)`;
  }

  // ---------------- Lifecycle ----------------

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'application');
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  override disconnectedCallback(): void {
    this.cancelGesture();
    this.detachWindowListeners();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.hostResizeObserver?.disconnect();
    this.hostResizeObserver = null;
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    // Seed the layout cache once the shadow DOM is in place. Subsequent
    // refreshes happen on host resize and on relevant property changes.
    this.updateLayoutCache();
    let scheduled = false;
    this.hostResizeObserver = new ResizeObserver(() => {
      if (scheduled) return;
      scheduled = true;
      // Defer to the next frame so we never write reactive state from inside
      // the observer's callback — that path produces "ResizeObserver loop
      // completed with undelivered notifications" warnings.
      requestAnimationFrame(() => {
        scheduled = false;
        this.updateLayoutCache();
      });
    });
    this.hostResizeObserver.observe(this);
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'animate-reflow') {
      this.animateReflow = !(newValue === null || newValue === 'false' || newValue === '0');
    }
  }

  // ---------------- FLIP animator ----------------

  protected override willUpdate(_changed: PropertyValues): void {
    if (!this.shouldAnimate()) {
      this.flipPreviousRects.clear();
      return;
    }
    const grid = this.shadowRoot?.querySelector<HTMLElement>('.tile-grid');
    if (!grid) return;
    this.flipPreviousRects.clear();
    grid.querySelectorAll<HTMLElement>('.tile').forEach((el) => {
      const id = el.dataset['tileId'];
      if (id) this.flipPreviousRects.set(id, el.getBoundingClientRect());
    });
  }

  protected override updated(changed: PropertyValues): void {
    // Refresh cached layout metrics when an input that determines them changes.
    // Reading layout in updated() is safe — the new style is already applied.
    if (
      changed.has('columnCount') ||
      changed.has('minColumnWidth') ||
      changed.has('minRowHeight') ||
      changed.has('gap')
    ) {
      this.updateLayoutCache();
    }
    if (!this.shouldAnimate() || this.flipPreviousRects.size === 0) return;
    const grid = this.shadowRoot?.querySelector<HTMLElement>('.tile-grid');
    if (!grid) return;
    const activeId = this.activeTileId();
    grid.querySelectorAll<HTMLElement>('.tile').forEach((el) => {
      const id = el.dataset['tileId'];
      if (!id || id === activeId) return;
      const prev = this.flipPreviousRects.get(id);
      if (!prev) return;
      const next = el.getBoundingClientRect();
      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      // Invert: jump back to old position with no transition…
      const previous = el.style.transition;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      // …then play forward on the next frame, restoring the transition.
      requestAnimationFrame(() => {
        el.style.transition = previous;
        el.style.transform = '';
      });
    });
    this.flipPreviousRects.clear();
  }

  private shouldAnimate(): boolean {
    if (!this.animateReflow) return false;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---------------- Pointer entry points ----------------

  private lastPointerPosition: { x: number; y: number } | null = null;

  private onTilePointerDown(event: PointerEvent, tile: MintTile): void {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (this.gestureState.kind !== 'idle') return;
    if (this.dragMode === 'off' || tile.disableMove) return;

    // Resize handles consume their own pointerdown via stopPropagation; if we
    // got here it's a drag-surface candidate.
    if (this.dragMode === 'header' || event.pointerType === 'touch') {
      // Header-only: only proceed if the click originated inside the header
      // shell. The slotted (light-DOM) target won't find shadow-DOM ancestors
      // via closest(), so walk the composed path instead.
      const inHeader = event
        .composedPath()
        .some((node) => node instanceof HTMLElement && node.classList?.contains('tile__header-shell'));
      if (!inHeader) return;
    }

    if (event.pointerType === 'touch') {
      this.armTouchDrag(event, tile);
    } else {
      this.armPointerDrag(event, tile);
    }
  }

  private onResizeHandlePointerDown(
    event: PointerEvent,
    tile: MintTile,
    mode: 'side' | 'bottom' | 'corner',
  ): void {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (tile.disableResize || this.resizeMode === 'off') return;
    if (this.gestureState.kind !== 'idle') return;
    event.stopPropagation();
    event.preventDefault();
    this.beginResize(event, tile, mode);
  }

  // ---------------- Drag arming ----------------

  private armPointerDrag(event: PointerEvent, tile: MintTile): void {
    // Mouse / pen: arm immediately past the 5 px threshold. We track the
    // pointer ourselves and convert to a real drag when distance exceeds
    // POINTER_DRAG_THRESHOLD_PX.
    const startX = event.clientX;
    const startY = event.clientY;
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) >= POINTER_DRAG_THRESHOLD_PX) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onCancel);
        window.removeEventListener('pointercancel', onCancel);
        this.beginDrag(e, tile);
      }
    };
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onCancel);
      window.removeEventListener('pointercancel', onCancel);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onCancel);
    window.addEventListener('pointercancel', onCancel);
  }

  private armTouchDrag(event: PointerEvent, tile: MintTile): void {
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;

    const pressingTimer = window.setTimeout(() => {
      // Visual feedback only — gesture not yet armed.
      if (this.gestureState.kind === 'arming-touch-drag' && this.gestureState.pointerId === pointerId) {
        // Force a re-render to flip data-pressing.
        this.requestUpdate();
      }
    }, TOUCH_PRESS_FEEDBACK_DELAY_MS);

    const armTimer = window.setTimeout(() => {
      if (this.gestureState.kind !== 'arming-touch-drag' || this.gestureState.pointerId !== pointerId) return;
      this.cleanupTouchArming();
      try {
        navigator.vibrate?.(10);
      } catch {
        // Silently ignore; vibrate isn't available everywhere.
      }
      this.beginDragFromTouchArm(tile, startX, startY, pointerId);
    }, TOUCH_LONG_PRESS_MS);

    this.gestureState = {
      kind: 'arming-touch-drag',
      pointerId,
      tileId: tile.id,
      startX,
      startY,
      timer: armTimer,
      pressingTimer,
    };
    this.gestureKind = 'arming-touch-drag';

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (this.gestureState.kind !== 'arming-touch-drag') return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > TOUCH_LONG_PRESS_SLOP_PX) {
        this.cleanupTouchArming();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onCancel);
        window.removeEventListener('pointercancel', onCancel);
      }
    };
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (this.gestureState.kind === 'arming-touch-drag') {
        this.cleanupTouchArming();
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onCancel);
      window.removeEventListener('pointercancel', onCancel);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onCancel);
    window.addEventListener('pointercancel', onCancel);
  }

  private cleanupTouchArming(): void {
    if (this.gestureState.kind !== 'arming-touch-drag') return;
    const { timer, pressingTimer } = this.gestureState;
    if (timer !== null) window.clearTimeout(timer);
    if (pressingTimer !== null) window.clearTimeout(pressingTimer);
    this.gestureState = { kind: 'idle' };
    this.gestureKind = 'idle';
    this.requestUpdate();
  }

  private beginDragFromTouchArm(tile: MintTile, startX: number, startY: number, pointerId: number): void {
    // Synthesize the same begin call as for mouse, with a fake pointer event.
    // Refresh the layout cache once at gesture start — guarantees fresh metrics
    // even if the grid has resized since the last cache tick.
    this.updateLayoutCache();
    const grid = this.shadowRoot?.querySelector<HTMLElement>('.tile-grid');
    if (!grid) return;
    const cell = this.cellMetrics;
    const gridRect = grid.getBoundingClientRect();
    const tileLeft = gridRect.left + (tile.position.colStart - 1) * (cell.width + cell.gapX);
    const tileTop = gridRect.top + (tile.position.rowStart - 1) * (cell.height + cell.gapY);
    this.gestureState = {
      kind: 'drag',
      pointerId,
      tileId: tile.id,
      pointerOffset: { dx: startX - tileLeft, dy: startY - tileTop },
      currentRect: { ...tile.position },
      blocked: false,
    };
    this.gestureKind = 'drag';
    this.lastPointerPosition = { x: startX, y: startY };
    this.attachWindowListeners();
    this.requestUpdate();
  }

  private beginDrag(event: PointerEvent, tile: MintTile): void {
    this.updateLayoutCache();
    const grid = this.shadowRoot?.querySelector<HTMLElement>('.tile-grid');
    if (!grid) return;
    const cell = this.cellMetrics;
    const gridRect = grid.getBoundingClientRect();
    const tileLeft = gridRect.left + (tile.position.colStart - 1) * (cell.width + cell.gapX);
    const tileTop = gridRect.top + (tile.position.rowStart - 1) * (cell.height + cell.gapY);
    this.gestureState = {
      kind: 'drag',
      pointerId: event.pointerId,
      tileId: tile.id,
      pointerOffset: { dx: event.clientX - tileLeft, dy: event.clientY - tileTop },
      currentRect: { ...tile.position },
      blocked: false,
    };
    this.gestureKind = 'drag';
    this.lastPointerPosition = { x: event.clientX, y: event.clientY };
    this.attachWindowListeners();
    this.runPackerForCurrentGesture();
  }

  private beginResize(event: PointerEvent, tile: MintTile, mode: 'side' | 'bottom' | 'corner'): void {
    this.gestureState = {
      kind: 'resize',
      pointerId: event.pointerId,
      tileId: tile.id,
      mode,
      startPointer: { x: event.clientX, y: event.clientY },
      startSpans: { colSpan: tile.position.colSpan, rowSpan: tile.position.rowSpan },
      currentRect: { ...tile.position },
      blocked: false,
    };
    this.gestureKind = 'resize';
    this.lastPointerPosition = { x: event.clientX, y: event.clientY };
    this.attachWindowListeners();
    this.runPackerForCurrentGesture();
  }

  private attachWindowListeners(): void {
    window.addEventListener('pointermove', this.onWindowPointerMove);
    window.addEventListener('pointerup', this.onWindowPointerUp);
    window.addEventListener('pointercancel', this.onWindowPointerCancel);
    window.addEventListener('keydown', this.onWindowKeyDown);
  }

  private detachWindowListeners(): void {
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.onWindowPointerUp);
    window.removeEventListener('pointercancel', this.onWindowPointerCancel);
    window.removeEventListener('keydown', this.onWindowKeyDown);
  }

  private handleEscapeKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.gestureState.kind !== 'idle') {
      e.preventDefault();
      this.cancelGesture();
    }
  }

  // ---------------- Pointer move / up / cancel ----------------

  private handlePointerMove(event: PointerEvent): void {
    const g = this.gestureState;
    if (g.kind === 'idle' || g.kind === 'arming-touch-drag') return;
    if (event.pointerId !== g.pointerId) return;
    this.lastPointerPosition = { x: event.clientX, y: event.clientY };
    this.runPackerForCurrentGesture();
  }

  private handlePointerUp(event: PointerEvent): void {
    const g = this.gestureState;
    if (g.kind === 'idle' || g.kind === 'arming-touch-drag') return;
    if (event.pointerId !== g.pointerId) return;
    if (g.blocked) {
      this.cancelGesture('blocked');
      return;
    }
    this.commitGesture();
  }

  private handlePointerCancel(event: PointerEvent): void {
    const g = this.gestureState;
    if (g.kind === 'idle') return;
    if (g.kind !== 'arming-touch-drag' && event.pointerId !== g.pointerId) return;
    this.cancelGesture();
  }

  // ---------------- Packer integration ----------------

  private runPackerForCurrentGesture(): void {
    const g = this.gestureState;
    if (g.kind !== 'drag' && g.kind !== 'resize') return;
    const tile = this.tiles.find((t) => t.id === g.tileId);
    if (!tile) {
      this.cancelGesture();
      return;
    }
    const rect = g.kind === 'drag' ? this.computeDragRect(g, tile) : this.computeResizeRect(g, tile);
    if (!rect) return;
    g.currentRect = rect;

    const cols = this.effectiveColumnCount;
    const result = pack(
      this.tiles.map((t) => ({ id: t.id, position: t.position, locked: t.disableMove })),
      { id: tile.id, rect },
      cols,
    );
    this.previewLayout = result.layout;
    g.blocked = result.blocked;
    this.blocked = result.blocked;
    this.requestUpdate();
  }

  private computeDragRect(g: Extract<GestureState, { kind: 'drag' }>, tile: MintTile): GridRect | null {
    const grid = this.shadowRoot?.querySelector<HTMLElement>('.tile-grid');
    if (!grid) return null;
    const cell = this.cellMetrics;
    const cols = this.effectiveColumnCount;
    const pointer = this.lastPointerPosition;
    if (!pointer) return null;
    const gridRect = grid.getBoundingClientRect();
    // Pointer position relative to grid origin, minus the where-on-the-tile offset.
    const localX = pointer.x - gridRect.left - g.pointerOffset.dx;
    const localY = pointer.y - gridRect.top - g.pointerOffset.dy;
    const colStart = Math.round(localX / (cell.width + cell.gapX)) + 1;
    const rowStart = Math.round(localY / (cell.height + cell.gapY)) + 1;
    return {
      colStart: Math.max(1, Math.min(colStart, cols - tile.position.colSpan + 1)),
      rowStart: Math.max(1, rowStart),
      colSpan: tile.position.colSpan,
      rowSpan: tile.position.rowSpan,
    };
  }

  private computeResizeRect(
    g: Extract<GestureState, { kind: 'resize' }>,
    tile: MintTile,
  ): GridRect | null {
    const cell = this.cellMetrics;
    const cols = this.effectiveColumnCount;
    const pointer = this.lastPointerPosition;
    if (!pointer) return null;
    const dx = pointer.x - g.startPointer.x;
    const dy = pointer.y - g.startPointer.y;
    const colDelta = Math.round(dx / (cell.width + cell.gapX));
    const rowDelta = Math.round(dy / (cell.height + cell.gapY));
    const colSpan =
      g.mode === 'bottom'
        ? g.startSpans.colSpan
        : Math.max(1, Math.min(g.startSpans.colSpan + colDelta, cols - tile.position.colStart + 1));
    const rowSpan =
      g.mode === 'side' ? g.startSpans.rowSpan : Math.max(1, g.startSpans.rowSpan + rowDelta);
    return {
      colStart: tile.position.colStart,
      rowStart: tile.position.rowStart,
      colSpan,
      rowSpan,
    };
  }

  // ---------------- Commit / cancel ----------------

  private commitGesture(): void {
    const g = this.gestureState;
    if (g.kind !== 'drag' && g.kind !== 'resize') return;
    const finalLayout = this.previewLayout;
    if (!finalLayout) {
      this.cleanupGesture();
      return;
    }

    const previousById = new Map(this.tiles.map((t) => [t.id, t.position]));
    const newTiles: MintTile[] = this.tiles.map((t) => {
      const placed = finalLayout.find((p) => p.id === t.id);
      return placed ? { ...t, position: placed.position } : t;
    });

    this.tiles = newTiles;

    // Dispatch per-tile change events.
    finalLayout.forEach((entry) => {
      const prev = previousById.get(entry.id);
      if (!prev || !this.positionsEqual(prev, entry.position)) {
        this.dispatchEvent(
          new CustomEvent<{ id: string; position: TilePosition }>('tilepositionchange', {
            detail: { id: entry.id, position: entry.position },
            bubbles: false,
            composed: true,
          }),
        );
      }
    });
    this.dispatchEvent(
      new CustomEvent<TileLayoutSnapshot>('tilelayoutchange', {
        detail: this.cloneSnapshot(finalLayout),
        bubbles: false,
        composed: true,
      }),
    );

    const movedTile = finalLayout.find((p) => p.id === g.tileId);
    if (movedTile) {
      this.liveRegionMessage =
        g.kind === 'drag'
          ? `Tile moved to row ${movedTile.position.rowStart}, column ${movedTile.position.colStart}`
          : `Tile resized to ${movedTile.position.colSpan} columns by ${movedTile.position.rowSpan} rows`;
    }

    this.cleanupGesture();
  }

  private cancelGesture(reason: 'cancel' | 'blocked' = 'cancel'): void {
    const g = this.gestureState;
    if (reason === 'blocked' && (g.kind === 'drag' || g.kind === 'resize')) {
      this.dispatchEvent(
        new CustomEvent<TileGestureBlocked>('tilegestureblocked', {
          detail: { id: g.tileId, reason: 'locked-overlap' },
          bubbles: false,
          composed: true,
        }),
      );
    }
    this.cleanupGesture();
  }

  private cleanupGesture(): void {
    if (this.gestureState.kind === 'arming-touch-drag') this.cleanupTouchArming();
    this.detachWindowListeners();
    this.gestureState = { kind: 'idle' };
    this.gestureKind = 'idle';
    this.previewLayout = null;
    this.blocked = false;
    this.lastPointerPosition = null;
    this.requestUpdate();
  }

  private positionsEqual(a: TilePosition, b: TilePosition): boolean {
    return (
      a.colStart === b.colStart &&
      a.rowStart === b.rowStart &&
      a.colSpan === b.colSpan &&
      a.rowSpan === b.rowSpan
    );
  }

  private cloneSnapshot(s: TileLayoutSnapshot): TileLayoutSnapshot {
    return s.map((p) => ({ id: p.id, position: { ...p.position } }));
  }

  private activeTileId(): string | null {
    const g = this.gestureState;
    if (g.kind === 'drag' || g.kind === 'resize' || g.kind === 'arming-touch-drag') return g.tileId;
    return null;
  }

  // ---------------- Public API ----------------

  /** Read-only snapshot of the current layout. Mirrors `BsDockManagerComponent.captureLayout()`. */
  captureLayout(): TileLayoutSnapshot {
    return this.tiles.map((t) => ({ id: t.id, position: { ...t.position } }));
  }

  /**
   * True while a drag or resize is in flight. The Angular wrapper uses this to
   * avoid clobbering `tiles` mid-gesture. Touch long-press arming does NOT
   * count — the WC isn't yet owning the layout during the hold.
   */
  get isGestureActive(): boolean {
    return this.gestureState.kind === 'drag' || this.gestureState.kind === 'resize';
  }

  // ---------------- Keyboard ----------------

  private onTileKeyDown(event: KeyboardEvent, tile: MintTile): void {
    if (tile.disableMove && tile.disableResize) return;
    const km = this.keyboardState;

    if (km.kind === 'idle') {
      if (event.key === ' ' && !tile.disableMove) {
        event.preventDefault();
        this.keyboardState = { kind: 'move', tileId: tile.id };
        this.liveRegionMessage = 'Move mode enabled. Use arrow keys to move; Enter to commit, Escape to cancel.';
        return;
      }
      return;
    }

    if (km.tileId !== tile.id) return;

    if (event.key === 'Escape' || event.key === 'Enter') {
      event.preventDefault();
      this.keyboardState = { kind: 'idle' };
      this.liveRegionMessage = event.key === 'Enter' ? 'Move committed.' : 'Move cancelled.';
      return;
    }

    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const isResize = event.shiftKey;
      this.applyKeyboardStep(tile, event.key as ArrowKey, isResize);
    }
  }

  private applyKeyboardStep(tile: MintTile, key: ArrowKey, isResize: boolean): void {
    const cols = this.effectiveColumnCount;
    const dx = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0;
    const dy = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0;
    const newRect: GridRect = isResize
      ? {
          colStart: tile.position.colStart,
          rowStart: tile.position.rowStart,
          colSpan: Math.max(1, Math.min(tile.position.colSpan + dx, cols - tile.position.colStart + 1)),
          rowSpan: Math.max(1, tile.position.rowSpan + dy),
        }
      : {
          colStart: Math.max(1, Math.min(tile.position.colStart + dx, cols - tile.position.colSpan + 1)),
          rowStart: Math.max(1, tile.position.rowStart + dy),
          colSpan: tile.position.colSpan,
          rowSpan: tile.position.rowSpan,
        };

    const result = pack(
      this.tiles.map((t) => ({ id: t.id, position: t.position, locked: t.disableMove })),
      { id: tile.id, rect: newRect },
      cols,
    );
    if (result.blocked) {
      this.liveRegionMessage = 'Move blocked.';
      return;
    }
    const newTiles: MintTile[] = this.tiles.map((t) => {
      const placed = result.layout.find((p) => p.id === t.id);
      return placed ? { ...t, position: placed.position } : t;
    });
    this.tiles = newTiles;
    this.dispatchEvent(
      new CustomEvent<TileLayoutSnapshot>('tilelayoutchange', {
        detail: this.cloneSnapshot(result.layout),
        bubbles: false,
        composed: true,
      }),
    );
    result.layout.forEach((entry) => {
      this.dispatchEvent(
        new CustomEvent<{ id: string; position: TilePosition }>('tilepositionchange', {
          detail: { id: entry.id, position: entry.position },
          bubbles: false,
          composed: true,
        }),
      );
    });
    this.liveRegionMessage = isResize
      ? `Tile resized to ${newRect.colSpan} columns by ${newRect.rowSpan} rows`
      : `Tile moved to row ${newRect.rowStart}, column ${newRect.colStart}`;
  }
}

type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

if (typeof customElements !== 'undefined' && !customElements.get('mp-tile-manager')) {
  customElements.define('mp-tile-manager', MintTileManagerElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-tile-manager': MintTileManagerElement;
  }
}
