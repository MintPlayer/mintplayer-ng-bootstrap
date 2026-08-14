import { LitElement, html, svg, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { LiveAnnouncerController } from '@mintplayer/web-components/a11y';
import {
  buildIndex,
  colorScale,
  composite,
  contrastText,
  arcPath,
  arcLabelTransform,
  fitArcLabel,
  fitCellLabel,
  partitionLayout,
  squarifyLayout,
  resolveFocus,
  subtreeDepth,
  levelOf,
  pathTo,
  type HierarchyHoverEventDetail,
  type HierarchyIndex,
  type HierarchyLoadErrorEventDetail,
  type HierarchyNode,
  type HierarchyNodeEventDetail,
  type ArcLabelFit,
  type PartitionNode,
  type RectNode,
} from '@mintplayer/web-components/charts/core';
import { hierarchyChartStyles } from '../styles';

export type HierarchyChartLayout = 'sunburst' | 'icicle' | 'treemap';

/** String-returning formatters; return `undefined` to fall back to the built-in text. */
export type HierarchyNodeFormatter = (node: HierarchyNode) => string | undefined;

/**
 * Async loader for a lazy node's children (a node with `hasChildren: true`
 * and no `children`). Invoked once per node when its child ring would enter
 * the rendered window; resolve with the children, or reject to surface a
 * `hierarchy-node-load-error` (activating the node again retries).
 * Matches codecov's report/tree API shape (depth + path).
 */
export type HierarchyChildrenLoader = (node: HierarchyNode) => Promise<HierarchyNode[]>;

const VIEW = 1000; // logical viewBox size; all geometry is in these units
const TAU = 2 * Math.PI;

function reducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * `<mp-hierarchy-chart>` — one weighted tree, three projections.
 *
 * `layout="sunburst" | "icicle" | "treemap"` switches the projection at
 * runtime; data model, color scale, focus/zoom state and the ARIA-tree
 * contract are shared. Arc size follows the summed LEAF `value` (never the
 * color metric — sizing by a percentage inverts salience, PRD charts-wc §1.1),
 * color follows `colorValue` through a clamped two-stop scale.
 *
 * Two kinds of zoom, deliberately distinct:
 * - SEMANTIC re-root (click/Enter/tap/breadcrumb): the subtree takes the full
 *   chart; controlled via `root-id` + `hierarchy-zoom`.
 * - GEOMETRIC magnification (ctrl/cmd+wheel, touch pinch, `+`/`-`/`0` keys,
 *   drag or two-finger pan): a view window mapped through the sunburst's
 *   viewBox / the div layouts' percentages — never a CSS transform. Labels
 *   hold their device-px size, so magnifying is what reveals small segments'
 *   captions. Resets on re-root, layout switch and data writes.
 *
 * No-JS tier: none (a proportional chart is meaningless without computed
 * geometry); the demo registers in axe.spec.ts only.
 *
 * Light-DOM properties:
 * - `data: HierarchyNode` (property only)
 * - `root-id` / `rootId` — controlled focus node (two-way via `hierarchy-zoom`)
 * - `max-depth`, `min-angle` (deg), `min-size` (logical px), `show-labels`,
 *   `label-font-size` (device px — constant across host size and zoom),
 *   `backdrop` (overrides backdrop auto-detection for label contrast),
 *   `color-min`, `color-max`, `color-start`, `color-end`
 * - `input-label` / `aria-label` — accessible name for the in-shadow tree
 *
 * Events: `hierarchy-zoom`, `hierarchy-node-select`, `hierarchy-node-hover`,
 * `hierarchy-node-load-error` (all bubbling + composed).
 */
export class MpHierarchyChart extends LitElement {
  static override styles = [hierarchyChartStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'layout',
      'root-id',
      'max-depth',
      'min-angle',
      'min-size',
      'show-labels',
      'label-font-size',
      'backdrop',
      'color-min',
      'color-max',
      'color-start',
      'color-end',
      'transition-duration',
      'locale',
      'zoom-gestures',
      'zoom-hint-label',
      'show-breadcrumb',
      'breadcrumb-label',
      'zoom-out-label',
      'metric-unit-label',
      'value-unit-label',
      'loading-label',
      // Copied onto the in-shadow role=tree node — the host stays generic.
      'aria-label',
      'input-label',
    ];
  }

  private _data: HierarchyNode | undefined;
  private _index: HierarchyIndex | undefined;
  private _layout: HierarchyChartLayout = 'sunburst';
  private _rootId: string | undefined;
  private _maxDepth: number | 'auto' | undefined = undefined;
  private _minAngle = 0.2; // degrees
  private _minSize = 4; // logical px (of the 1000-unit square), cartesian cull
  private _showLabels = true;
  private _labelFontSize = 12; // device px — constant across host size and zoom (labels never scale)
  private _backdropOverride: string | undefined;
  /** The opaque surface behind the chart; labels contrast against fill composited over this. */
  private _backdrop = '#ffffff';
  /**
   * Device px per viewBox unit, measured by a ResizeObserver. The fallback is
   * a representative 420px host so environments without ResizeObserver (jsdom)
   * stay deterministic for the fit specs.
   */
  private _hostScale = 0.42;
  private _resizeObserver: ResizeObserver | undefined;
  private _colorMin = 0;
  private _colorMax = 100;
  private _colorStart = '#fe0000';
  private _colorEnd = '#21b577';
  private _inputLabel: string | null = null;
  private _transitionDuration = 300;
  private _locale: string | undefined;
  private _tooltipFormatter: HierarchyNodeFormatter | undefined;
  private _labelFormatter: HierarchyNodeFormatter | undefined;
  private _loadChildren: HierarchyChildrenLoader | undefined;
  private _loadingIds = new Set<string>();
  private _failedIds = new Set<string>();
  /**
   * Nodes whose loader has already resolved. A folder can legitimately come
   * back EMPTY, which leaves `hasChildren` true and `children` empty — the
   * same shape as 'not loaded yet'. Without this, such a node is re-requested
   * on every render forever.
   */
  private _loadedIds = new Set<string>();
  private _loadingLabel = 'Loading';

  private _fill = colorScale(this._colorMin, this._colorMax, this._colorStart, this._colorEnd);

  /** Sunburst tween: spans of the previous render, and progress 0..1 (1 = settled). */
  private _prevSpans = new Map<string, { x0: number; x1: number; depth: number }>();
  private _tween = 1;
  private _tweenFrame = 0;
  private _hoveredId: string | null = null;

  // Roving tabindex over the rendered treeitems (one tab stop for the tree).
  private _focusedId: string | null = null;
  private _restoreFocus = false;
  private _rendered: Array<{ id: string; parentId: string | null; depth: number }> = [];
  private _typeahead = '';
  private _typeaheadTimer = 0;
  private _zoomOutLabel = 'Zoom out one level';
  private _metricUnitLabel = '%';
  private _valueUnitLabel = '';

  // omitRole: the in-shadow containers carry role=tree; an owned role=status
  // sibling would be invalid ARIA inside the host's transparent shadow.
  private readonly liveAnnouncer = new LiveAnnouncerController(this, { omitRole: true });

  /** The whole tree, rolled up once per write. */
  get data(): HierarchyNode | undefined {
    return this._data;
  }
  set data(value: HierarchyNode | undefined) {
    this._data = value;
    this._index = value ? buildIndex(value) : undefined;
    this.resetZoom();
  }

  get layout(): HierarchyChartLayout {
    return this._layout;
  }
  set layout(value: HierarchyChartLayout) {
    this._layout = value === 'icicle' || value === 'treemap' ? value : 'sunburst';
    this.resetZoom(); // projections don't share a view window
  }

  get rootId(): string | undefined {
    return this._rootId;
  }
  set rootId(value: string | undefined) {
    const next = value || undefined;
    if (next === this._rootId) return;
    this.beginTween();
    this._rootId = next;
    // Reflect for inspectability; the equality guard above breaks the
    // attributeChangedCallback -> setter loop.
    if (next === undefined) this.removeAttribute('root-id');
    else this.setAttribute('root-id', next);
    this.requestUpdate();
  }

  /**
   * Levels rendered outward from the focus node, or `'auto'` for every loaded
   * level. Any positive number is valid.
   *
   * Left unset it resolves to `'auto'` — a chart given a whole tree should draw
   * the tree it was given — EXCEPT when a `loadChildren` loader is present:
   * `'auto'` treats the deepest rendered ring as a load candidate, so an
   * unbounded lazy chart walks the entire remote tree one level per render (see
   * `loadLazyCandidates`). Lazy charts therefore keep the bounded 2-level
   * window (codecov's) unless the consumer asks for `'auto'` explicitly and
   * means it.
   */
  get maxDepth(): number | 'auto' {
    return this._maxDepth ?? (this._loadChildren ? 2 : 'auto');
  }
  set maxDepth(value: number | 'auto') {
    this._maxDepth = value === 'auto' ? 'auto' : Math.max(1, Math.floor(Number(value) || 2));
    this.requestUpdate();
  }

  /**
   * `maxDepth` resolved against the current data. Never 0: a chart showing no
   * ring at all is not a rendering anyone asked for, so a leaf focus still
   * draws its (empty) first ring.
   */
  private get renderedDepth(): number {
    const configured = this.maxDepth;
    if (configured !== 'auto') return configured;
    return this._index ? Math.max(1, subtreeDepth(this._index, this._rootId)) : 1;
  }

  get minAngle(): number {
    return this._minAngle;
  }
  set minAngle(value: number) {
    this._minAngle = Math.max(0, Number(value) || 0);
    this.requestUpdate();
  }

  get minSize(): number {
    return this._minSize;
  }
  set minSize(value: number) {
    this._minSize = Math.max(0, Number(value) || 0);
    this.requestUpdate();
  }

  get showLabels(): boolean {
    return this._showLabels;
  }
  set showLabels(value: boolean) {
    this._showLabels = !!value;
    this.requestUpdate();
  }

  /** Label font size in DEVICE px — held constant across host size and zoom state. */
  get labelFontSize(): number {
    return this._labelFontSize;
  }
  set labelFontSize(value: number) {
    this._labelFontSize = Math.max(1, Number(value) || 12);
    this.requestUpdate();
  }

  /**
   * Opaque CSS color behind the chart, used to composite translucent fills
   * before picking a contrasting label color. Unset = auto-detected from the
   * nearest opaque ancestor background (set it when the walk cannot see the
   * real backdrop: images, gradients, cross-document embedding).
   */
  get backdrop(): string | undefined {
    return this._backdropOverride;
  }
  set backdrop(value: string | undefined) {
    this._backdropOverride = value || undefined;
    this.requestUpdate();
  }

  get colorMin(): number {
    return this._colorMin;
  }
  set colorMin(value: number) {
    this._colorMin = Number(value) || 0;
    this.rebuildScale();
  }

  get colorMax(): number {
    return this._colorMax;
  }
  set colorMax(value: number) {
    this._colorMax = Number(value) || 0;
    this.rebuildScale();
  }

  get colorStart(): string {
    return this._colorStart;
  }
  set colorStart(value: string) {
    this._colorStart = value || '#fe0000';
    this.rebuildScale();
  }

  get colorEnd(): string {
    return this._colorEnd;
  }
  set colorEnd(value: string) {
    this._colorEnd = value || '#21b577';
    this.rebuildScale();
  }

  get inputLabel(): string | null {
    return this._inputLabel;
  }
  set inputLabel(value: string | null) {
    this._inputLabel = value ?? null;
    this.requestUpdate();
  }

  get transitionDuration(): number {
    return this._transitionDuration;
  }
  set transitionDuration(value: number) {
    this._transitionDuration = Math.max(0, Number(value) || 0);
    // The div layouts animate via this CSS custom property; reduced-motion
    // kills the transition in the stylesheet regardless of its value.
    this.style.setProperty('--mp-hierarchy-chart-transition-duration', `${this._transitionDuration}ms`);
  }

  get locale(): string | undefined {
    return this._locale;
  }
  set locale(value: string | undefined) {
    this._locale = value || undefined;
    this.requestUpdate();
  }

  get tooltipFormatter(): HierarchyNodeFormatter | undefined {
    return this._tooltipFormatter;
  }
  set tooltipFormatter(value: HierarchyNodeFormatter | undefined) {
    this._tooltipFormatter = value;
  }

  get labelFormatter(): HierarchyNodeFormatter | undefined {
    return this._labelFormatter;
  }
  set labelFormatter(value: HierarchyNodeFormatter | undefined) {
    this._labelFormatter = value;
    this.requestUpdate();
  }

  get loadChildren(): HierarchyChildrenLoader | undefined {
    return this._loadChildren;
  }
  set loadChildren(value: HierarchyChildrenLoader | undefined) {
    this._loadChildren = value;
    this.requestUpdate();
  }

  get loadingLabel(): string {
    return this._loadingLabel;
  }
  set loadingLabel(value: string) {
    this._loadingLabel = value ?? 'Loading';
  }

  private rebuildScale(): void {
    this._fill = colorScale(this._colorMin, this._colorMax, this._colorStart, this._colorEnd);
    this.requestUpdate();
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case 'layout': this.layout = (newValue ?? 'sunburst') as HierarchyChartLayout; break;
      case 'root-id': this.rootId = newValue ?? undefined; break;
      case 'max-depth':
        // Removing the attribute returns to the resolved default, not to 2.
        if (newValue === null) { this._maxDepth = undefined; this.requestUpdate(); }
        else this.maxDepth = newValue === 'auto' ? 'auto' : Number(newValue);
        break;
      case 'min-angle': this.minAngle = Number(newValue ?? 0.2); break;
      case 'min-size': this.minSize = Number(newValue ?? 4); break;
      case 'show-labels': this.showLabels = newValue !== 'false' && newValue !== null; break;
      case 'label-font-size': this.labelFontSize = Number(newValue ?? 12); break;
      case 'backdrop': this.backdrop = newValue ?? undefined; break;
      case 'color-min': this.colorMin = Number(newValue ?? 0); break;
      case 'color-max': this.colorMax = Number(newValue ?? 100); break;
      case 'color-start': this.colorStart = newValue ?? '#fe0000'; break;
      case 'color-end': this.colorEnd = newValue ?? '#21b577'; break;
      case 'transition-duration': this.transitionDuration = Number(newValue ?? 300); break;
      case 'locale': this.locale = newValue ?? undefined; break;
      case 'zoom-gestures': this.zoomGestures = newValue ?? 'wheel pinch'; break;
      case 'zoom-hint-label': this._zoomHintLabel = newValue ?? undefined; break;
      case 'show-breadcrumb': this.showBreadcrumb = newValue !== 'false' && newValue !== null; break;
      case 'breadcrumb-label': this._breadcrumbLabel = newValue ?? 'Chart path'; this.requestUpdate(); break;
      case 'zoom-out-label': this._zoomOutLabel = newValue ?? 'Zoom out one level'; this.requestUpdate(); break;
      case 'loading-label': this._loadingLabel = newValue ?? 'Loading'; break;
      case 'metric-unit-label': this._metricUnitLabel = newValue ?? '%'; this.requestUpdate(); break;
      case 'value-unit-label': this._valueUnitLabel = newValue ?? ''; this.requestUpdate(); break;
      case 'aria-label': this.requestUpdate(); break;
      case 'input-label': this.inputLabel = newValue; break;
    }
  }

  private _showBreadcrumb = false;
  private _breadcrumbLabel = 'Chart path';

  /**
   * Renders the focus path as real buttons above the chart: a single-pointer,
   * keyboard-operable way back up, and the visible statement of zoom state
   * (PRD hierarchy-chart-zoom-labels B1). Off by default.
   */
  get showBreadcrumb(): boolean {
    return this._showBreadcrumb;
  }
  set showBreadcrumb(value: boolean) {
    this._showBreadcrumb = !!value;
    this.requestUpdate();
  }

  get breadcrumbLabel(): string {
    return this._breadcrumbLabel;
  }
  set breadcrumbLabel(value: string) {
    this._breadcrumbLabel = value || 'Chart path';
    this.requestUpdate();
  }

  get zoomOutLabel(): string {
    return this._zoomOutLabel;
  }
  set zoomOutLabel(value: string) {
    this._zoomOutLabel = value || 'Zoom out one level';
    this.requestUpdate();
  }

  get metricUnitLabel(): string {
    return this._metricUnitLabel;
  }
  set metricUnitLabel(value: string) {
    this._metricUnitLabel = value ?? '%';
    this.requestUpdate();
  }

  get valueUnitLabel(): string {
    return this._valueUnitLabel;
  }
  set valueUnitLabel(value: string) {
    this._valueUnitLabel = value ?? '';
    this.requestUpdate();
  }

  /** The node the chart is rooted on right now (tree root when root-id is unset). */
  private get focusedRoot(): HierarchyNode | undefined {
    return this._index ? resolveFocus(this._index, this._rootId) : undefined;
  }

  /* ---------- rendered size + backdrop (label contrast inputs) ---------- */

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('wheel', this._wheelListener, { passive: false });
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver((entries) => {
        const width = entries[entries.length - 1]?.contentRect.width;
        if (!width) return;
        const scale = width / VIEW;
        if (Math.abs(scale - this._hostScale) > 0.001) {
          this._hostScale = scale;
          this.requestUpdate();
        }
      });
      this._resizeObserver.observe(this);
    }
  }

  override disconnectedCallback(): void {
    this.removeEventListener('wheel', this._wheelListener);
    clearTimeout(this._hintTimer);
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    // Skip mid-tween frames: labels are hidden then, and the walk is not free.
    if (this._tween >= 1) this.resolveBackdrop();
  }

  /**
   * The first opaque computed background-color above the host (shadow roots
   * crossed via .host). A live theme flip is picked up on the next render —
   * one frame of suboptimal-but-legible contrast, self-correcting.
   */
  private resolveBackdrop(): void {
    if (this._backdropOverride) {
      this._backdrop = this._backdropOverride;
      return;
    }
    if (typeof getComputedStyle !== 'function') return;
    let el: Element | null = this;
    while (el) {
      const bg = getComputedStyle(el).backgroundColor;
      if (isOpaqueColor(bg)) {
        this._backdrop = bg;
        return;
      }
      const root = el.getRootNode();
      el = el.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    }
    // Nothing opaque anywhere (jsdom, detached trees): keep the white default.
  }

  /** Which token bucket a label over this node should use: the surface's tone. */
  private surfaceToneOf(node: HierarchyNode, opacity: number): 'light' | 'dark' {
    const fill = this.fillOf(node);
    const surface = fill ? composite(fill, this._backdrop, opacity) : undefined;
    return this.toneOfSurface(surface);
  }

  private toneOfSurface(surface: string | undefined): 'light' | 'dark' {
    const text = (surface !== undefined ? contrastText(surface) : undefined)
      ?? contrastText(this._backdrop)
      ?? 'dark';
    // 'dark' TEXT reads best on a 'light' SURFACE and vice versa.
    return text === 'dark' ? 'light' : 'dark';
  }

  /* ---------- gesture zoom (the semantic ladder — PRD hierarchy-chart-zoom-labels Z1–Z5) ---------- */

  private _gestures = new Set<'wheel' | 'pinch'>(['wheel', 'pinch']);
  private _zoomHintLabel: string | undefined;
  private _hintVisible = false;
  private _hintTimer = 0;
  // Non-passive by intent: a consumed ctrl/cmd+wheel must not also page-zoom.
  private readonly _wheelListener = (event: WheelEvent): void => this.onWheel(event);

  /** Space-separated gesture allowlist: 'wheel pinch' (default) | 'wheel' | 'pinch' | 'none'. */
  get zoomGestures(): string {
    return this._gestures.size ? [...this._gestures].join(' ') : 'none';
  }
  set zoomGestures(value: string) {
    const parts = (value ?? '').toLowerCase().split(/\s+/);
    this._gestures = new Set(
      parts.filter((p): p is 'wheel' | 'pinch' => p === 'wheel' || p === 'pinch'),
    );
  }

  get zoomHintLabel(): string {
    if (this._zoomHintLabel !== undefined) return this._zoomHintLabel;
    const apple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '');
    return apple ? 'Use ⌘ + scroll to zoom the chart' : 'Use Ctrl + scroll to zoom the chart';
  }
  set zoomHintLabel(value: string | undefined) {
    this._zoomHintLabel = value || undefined;
  }

  /**
   * GEOMETRIC view state (user decision 2026-08-14): ctrl/cmd+wheel and pinch
   * magnify the chart itself — labels hold their device-px size, so zooming
   * in is what makes small segments' captions fit (the fit test re-runs per
   * zoom state). Implemented as a view window over normalized content
   * coordinates — the sunburst maps it to its viewBox, the div layouts map
   * their percentage geometry through it — never a CSS transform, so text
   * stays crisp and nothing re-rasterizes. Click/Enter/breadcrumb keep the
   * SEMANTIC re-root, which resets the view (the subtree fills the chart).
   */
  private _viewZoom = 1;
  private _viewX = 0;
  private _viewY = 0;
  private static readonly MAX_ZOOM = 32;

  /** Current geometric magnification (1 = fitted). Read-only state for consumers/tests. */
  get zoomLevel(): number {
    return this._viewZoom;
  }

  /** Programmatic geometric zoom, anchored at chart fractions (default: center). */
  setZoomLevel(zoom: number, anchorX = 0.5, anchorY = 0.5): void {
    const next = Math.min(MpHierarchyChart.MAX_ZOOM, Math.max(1, Number(zoom) || 1));
    // The content point under the anchor stays under the anchor.
    const contentX = this._viewX + anchorX / this._viewZoom;
    const contentY = this._viewY + anchorY / this._viewZoom;
    this._viewZoom = next;
    this._viewX = clampView(contentX - anchorX / next, next);
    this._viewY = clampView(contentY - anchorY / next, next);
    this.requestUpdate();
  }

  resetZoom(): void {
    this._viewZoom = 1;
    this._viewX = 0;
    this._viewY = 0;
    this.requestUpdate();
  }

  /** Pan by chart-screen fractions (drag / two-finger move). */
  private panBy(dxFraction: number, dyFraction: number): void {
    if (this._viewZoom <= 1) return;
    this._viewX = clampView(this._viewX - dxFraction / this._viewZoom, this._viewZoom);
    this._viewY = clampView(this._viewY - dyFraction / this._viewZoom, this._viewZoom);
    this.requestUpdate();
  }

  /** Map a normalized content rect through the view window to chart fractions. */
  private viewRect(x0: number, y0: number, x1: number, y1: number): { x0: number; y0: number; x1: number; y1: number } {
    const z = this._viewZoom;
    return {
      x0: (x0 - this._viewX) * z,
      y0: (y0 - this._viewY) * z,
      x1: (x1 - this._viewX) * z,
      y1: (y1 - this._viewY) * z,
    };
  }

  /** Pointer position as chart fractions, for anchor-at-cursor zooming. */
  private chartAnchor(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = this.shadowRoot?.querySelector<HTMLElement>('.chart')?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  /** Device px per normalized content unit — the label fit tests' scale. */
  private get effectiveScale(): number {
    return this._hostScale * this._viewZoom;
  }

  private onWheel(event: WheelEvent): void {
    if (!this._gestures.has('wheel') || !this._index) return;
    if (!event.ctrlKey && !event.metaKey) {
      this.showZoomHint();
      return; // never captured: page scroll survives (FoamTree's documented mistake)
    }
    event.preventDefault(); // claimed: chart zoom instead of page zoom, over the chart only
    // deltaMode normalization + clamp: engines report ±1 line to ±100 px per notch.
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (this.clientHeight || 400) : 1;
    const delta = Math.max(-100, Math.min(100, event.deltaY * unit));
    const anchor = this.chartAnchor(event);
    this.setZoomLevel(this._viewZoom * Math.exp(-delta * 0.005), anchor.x, anchor.y);
  }

  /* ----- touch pinch (S4-gated: pan-x pan-y delivers two pointers, Chromium-measured) ----- */

  private readonly _pinchPointers = new Map<number, { x: number; y: number }>();
  /* ----- mouse/pen drag pan (only meaningful while zoomed in) ----- */
  private _dragPointer: number | null = null;
  private _dragLast: { x: number; y: number } = { x: 0, y: 0 };
  private _dragTotal = 0;
  private _dragMoved = false;

  private pinchDistance(): number {
    const [p1, p2] = [...this._pinchPointers.values()];
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  private pinchMidpoint(): { x: number; y: number } {
    const [p1, p2] = [...this._pinchPointers.values()];
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      if (!this._gestures.has('pinch')) return;
      // No preventDefault on a touch pointerdown: it suppresses the synthesized
      // click that drives tap-to-re-root (repo rule).
      this._pinchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      return;
    }
    // Mouse/pen: primary-button drag pans the zoomed view. At 1x there is
    // nothing to pan, so plain clicking is untouched.
    if (this._viewZoom > 1 && event.button === 0) {
      this._dragPointer = event.pointerId;
      this._dragLast = { x: event.clientX, y: event.clientY };
      this._dragTotal = 0;
      this._dragMoved = false;
    }
  }

  /** @returns true when the move belonged to a pinch or drag (skip hover handling). */
  private trackViewGesture(event: PointerEvent): boolean {
    if (event.pointerType === 'touch' && this._pinchPointers.has(event.pointerId)) {
      if (this._pinchPointers.size !== 2) {
        this._pinchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        return false;
      }
      const beforeDistance = this.pinchDistance();
      const beforeMid = this.pinchMidpoint();
      this._pinchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (beforeDistance > 0) {
        const mid = this.pinchMidpoint();
        const anchor = this.chartAnchor({ clientX: mid.x, clientY: mid.y });
        // Continuous: spread magnifies, squeeze shrinks, midpoint movement pans.
        this.setZoomLevel(this._viewZoom * (this.pinchDistance() / beforeDistance), anchor.x, anchor.y);
        const rect = this.shadowRoot?.querySelector<HTMLElement>('.chart')?.getBoundingClientRect();
        if (rect?.width && rect.height) {
          this.panBy((mid.x - beforeMid.x) / rect.width, (mid.y - beforeMid.y) / rect.height);
        }
      }
      return true;
    }
    if (this._dragPointer === event.pointerId) {
      const dx = event.clientX - this._dragLast.x;
      const dy = event.clientY - this._dragLast.y;
      this._dragLast = { x: event.clientX, y: event.clientY };
      this._dragTotal += Math.abs(dx) + Math.abs(dy);
      if (this._dragTotal > 3) this._dragMoved = true; // a jiggly click still activates
      const rect = this.shadowRoot?.querySelector<HTMLElement>('.chart')?.getBoundingClientRect();
      if (rect?.width && rect.height) this.panBy(dx / rect.width, dy / rect.height);
      return true;
    }
    return false;
  }

  /** pointerup ends the gesture; pointercancel abandons it (divergent engines degrade to tap). */
  private endViewGesture(event: PointerEvent): void {
    this._pinchPointers.delete(event.pointerId);
    if (this._dragPointer === event.pointerId) this._dragPointer = null;
  }

  private showZoomHint(): void {
    this._hintVisible = true;
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => {
      this._hintVisible = false;
      this.requestUpdate();
    }, 1500) as unknown as number;
    this.requestUpdate();
  }

  /* ---------- zoom ---------- */

  /** Re-root on a node id (undefined = tree root) and emit `hierarchy-zoom`. */
  zoomTo(id: string | undefined): void {
    const index = this._index;
    if (!index) return;
    const target = resolveFocus(index, id);
    if (target === this.focusedRoot) return;
    this.resetZoom(); // re-rooting refits the subtree; a stale magnification would disorient
    this.rootId = target === index.root ? undefined : target.id;
    this.liveAnnouncer.announce(this.labelText(target));
    this.emit<HierarchyNodeEventDetail>('hierarchy-zoom', { node: target, path: pathTo(index, target) });
  }

  /** Move the roving tabindex (and DOM focus) to a rendered node. */
  focusNode(id: string): void {
    if (this._rendered.some((r) => r.id === id)) {
      this._focusedId = id;
      this._restoreFocus = true;
      this.requestUpdate();
    }
  }

  private zoomOut(): void {
    const index = this._index;
    const focus = this.focusedRoot;
    if (!index || !focus || focus === index.root) return;
    this.zoomTo(index.parents.get(focus.id)?.id);
  }

  /* ---------- sunburst tween ---------- */

  private beginTween(): void {
    if (this._transitionDuration <= 0 || reducedMotion() || this._layout !== 'sunburst') return;
    if (!this._prevSpans.size) return; // nothing rendered yet
    cancelAnimationFrame(this._tweenFrame);
    // _prevSpans always holds the spans as DRAWN, so a retarget mid-tween
    // simply restarts from the current visual state.
    const start = performance.now();
    const step = (now: number): void => {
      this._tween = Math.min(1, (now - start) / this._transitionDuration);
      this.requestUpdate();
      if (this._tween < 1) this._tweenFrame = requestAnimationFrame(step);
    };
    this._tween = 0;
    this._tweenFrame = requestAnimationFrame(step);
  }

  private tweenedSpan(n: PartitionNode): { x0: number; x1: number } {
    if (this._tween >= 1) return n;
    const t = 1 - (1 - this._tween) * (1 - this._tween);
    const prev = this._prevSpans.get(n.node.id)
      // An entering arc grows out of its own start edge.
      ?? { x0: n.x0, x1: n.x0 };
    return {
      x0: prev.x0 + (n.x0 - prev.x0) * t,
      x1: prev.x1 + (n.x1 - prev.x1) * t,
    };
  }

  /* ---------- pointer interaction ---------- */

  private nodeFromEvent(event: Event): HierarchyNode | undefined {
    const target = (event.composedPath()[0] as Element | undefined)?.closest?.('[data-id]');
    const id = target?.getAttribute('data-id');
    return id ? this._index?.byId.get(id) : undefined;
  }

  private onClick(event: MouseEvent): void {
    // A drag-pan release is not an activation.
    if (this._dragMoved) {
      this._dragMoved = false;
      return;
    }
    const index = this._index;
    const node = this.nodeFromEvent(event);
    if (!index || !node) return;
    if (node === this.focusedRoot) {
      this.zoomOut();
      return;
    }
    // Activating a node retries a failed OR empty load.
    this._failedIds.delete(node.id);
    this._loadedIds.delete(node.id);
    if (node.children?.length || (node.hasChildren && this._loadChildren)) {
      this.zoomTo(node.id);
      return;
    }
    this.emit<HierarchyNodeEventDetail>('hierarchy-node-select', { node, path: pathTo(index, node) });
  }

  /**
   * Escape hides the tooltip (WCAG 1.4.13 dismissable) BEFORE zooming out;
   * it stays hidden for that node until the pointer/focus moves elsewhere.
   */
  private _dismissedForId: string | null = null;

  private get tooltipEl(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('.chart-tooltip') ?? null;
  }

  private isTooltipVisible(): boolean {
    return this.tooltipEl?.hasAttribute('data-visible') ?? false;
  }

  /** Show the tooltip for a node at chart-relative coordinates, clamped inside the chart. */
  private showTooltip(node: HierarchyNode, x: number, y: number): void {
    const tooltip = this.tooltipEl;
    const chart = this.shadowRoot?.querySelector<HTMLElement>('.chart');
    if (!tooltip || !chart) return;
    tooltip.textContent = this.tooltipText(node);
    tooltip.setAttribute('data-visible', '');
    // Measure after it is visible, then keep it fully inside the chart. The
    // +12px offset keeps it out of the pointer-to-node line (it takes no
    // pointer events, so hovering "onto" it keeps the node hovered — 1.4.13).
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    tooltip.style.left = `${Math.max(0, Math.min(x + 12, chart.clientWidth - width))}px`;
    tooltip.style.top = `${Math.max(0, Math.min(y + 12, chart.clientHeight - height))}px`;
  }

  private hideTooltip(): void {
    this.tooltipEl?.removeAttribute('data-visible');
  }

  private onPointerMove(event: PointerEvent): void {
    const index = this._index;
    if (!index) return;
    if (this.trackViewGesture(event)) return; // pinch/drag steer the view; they don't hover
    const node = this.nodeFromEvent(event);
    if (!node || node === this.focusedRoot) {
      this.clearHover();
      return;
    }
    if (node.id !== this._dismissedForId) {
      this._dismissedForId = null;
      const rect = this.shadowRoot?.querySelector<HTMLElement>('.chart')?.getBoundingClientRect();
      if (rect) this.showTooltip(node, event.clientX - rect.left, event.clientY - rect.top);
    }
    if (this._hoveredId !== node.id) {
      this._hoveredId = node.id;
      this.emit<HierarchyHoverEventDetail>('hierarchy-node-hover', { node, path: pathTo(index, node) });
    }
  }

  private clearHover(): void {
    this.hideTooltip();
    this._dismissedForId = null;
    if (this._hoveredId !== null) {
      this._hoveredId = null;
      this.emit<HierarchyHoverEventDetail>('hierarchy-node-hover', { node: null, path: [] });
    }
  }

  /** Keyboard parity for the hover tooltip (1.4.13): show on focus, hide on blur. */
  private onFocusIn(event: FocusEvent): void {
    const target = (event.composedPath()[0] as Element | undefined)?.closest?.('[role="treeitem"][data-id]');
    const id = target?.getAttribute('data-id');
    const node = id ? this._index?.byId.get(id) : undefined;
    if (!node || node === this.focusedRoot || node.id === this._dismissedForId) return;
    this._dismissedForId = null;
    const chartRect = this.shadowRoot?.querySelector<HTMLElement>('.chart')?.getBoundingClientRect();
    const rect = target?.getBoundingClientRect();
    if (!chartRect || !rect) return;
    this.showTooltip(
      node,
      rect.left - chartRect.left + rect.width / 2,
      rect.top - chartRect.top + rect.height / 2,
    );
  }

  private onFocusOut(): void {
    this.hideTooltip();
  }

  private tooltipText(node: HierarchyNode): string {
    const custom = this._tooltipFormatter?.(node);
    if (custom !== undefined) return custom;
    const numbers = new Intl.NumberFormat(this._locale || this.closest('[lang]')?.getAttribute('lang') || undefined);
    const metric = this._index?.colorValues.get(node.id);
    const value = this._index?.values.get(node.id);
    return [
      node.name,
      metric !== undefined ? `${numbers.format(Math.round(metric * 10) / 10)}%` : undefined,
      value !== undefined && value > 0 ? numbers.format(value) : undefined,
    ].filter((part): part is string => part !== undefined).join(' — ');
  }

  private labelText(node: HierarchyNode): string {
    return this._labelFormatter?.(node) ?? node.name;
  }

  /** Localized per-node accessible name: "components, 82%, 1,234 lines". */
  private accessibleName(node: HierarchyNode): string {
    const numbers = new Intl.NumberFormat(this._locale || this.closest('[lang]')?.getAttribute('lang') || undefined);
    const metric = this._index?.colorValues.get(node.id);
    const value = this._index?.values.get(node.id);
    return [
      this.labelText(node),
      metric !== undefined ? `${numbers.format(Math.round(metric * 10) / 10)}${this._metricUnitLabel}` : undefined,
      value !== undefined && value > 0
        ? `${numbers.format(value)}${this._valueUnitLabel ? ` ${this._valueUnitLabel}` : ''}`
        : undefined,
    ].filter((part): part is string => part !== undefined).join(', ');
  }

  private emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true }));
  }

  /* ---------- keyboard (APG tree, adapted: siblings wrap, Down = outward) ---------- */

  private onKeyDown(event: KeyboardEvent): void {
    const index = this._index;
    const item = (event.composedPath()[0] as Element | undefined)?.closest?.('[role="treeitem"][data-id]');
    const id = item?.getAttribute('data-id');
    if (!index || !id) return;

    const move = (target: string | undefined): void => {
      if (target !== undefined) {
        this._focusedId = target;
        this._restoreFocus = true;
        this.requestUpdate();
      }
    };
    const entry = this._rendered.find((r) => r.id === id);
    const siblings = this._rendered.filter((r) => r.parentId === entry?.parentId);
    const at = siblings.findIndex((r) => r.id === id);

    switch (event.key) {
      case 'ArrowRight':
        move(siblings[(at + 1) % siblings.length]?.id);
        break;
      case 'ArrowLeft':
        move(siblings[(at - 1 + siblings.length) % siblings.length]?.id);
        break;
      case 'ArrowDown':
        move(this._rendered.find((r) => r.parentId === id)?.id);
        break;
      case 'ArrowUp':
        move(this._rendered.some((r) => r.id === entry?.parentId) ? entry?.parentId ?? undefined : undefined);
        break;
      case 'Home':
        move(siblings[0]?.id);
        break;
      case 'End':
        move(siblings[siblings.length - 1]?.id);
        break;
      case 'Enter': {
        const node = index.byId.get(id);
        if (!node) return;
        // Activating a node retries a failed OR empty load.
    this._failedIds.delete(node.id);
    this._loadedIds.delete(node.id);
        if (node === this.focusedRoot) this.zoomOut();
        else if (node.children?.length || (node.hasChildren && this._loadChildren)) this.zoomTo(node.id);
        else this.emit<HierarchyNodeEventDetail>('hierarchy-node-select', { node, path: pathTo(index, node) });
        break;
      }
      case 'Escape':
        // Ordering: tooltip (1.4.13 dismissable) -> geometric view reset ->
        // semantic zoom-out; at the tree root with a fitted view, bubble.
        if (this.isTooltipVisible()) {
          this.hideTooltip();
          this._dismissedForId = id;
          break;
        }
        if (this._viewZoom > 1) {
          this.resetZoom();
          break;
        }
        if (this.focusedRoot === this._index?.root) return; // nothing to close: let Escape bubble
        this.zoomOut();
        break;
      case 'Backspace':
        if (this.focusedRoot === this._index?.root) return;
        this.zoomOut();
        break;
      // Keyboard equivalent of the wheel/pinch magnification (2.1.1),
      // anchored on the focused node so it stays in view.
      case '+':
      case '=':
        this.zoomKeyboard(id, this._viewZoom * 1.5);
        break;
      case '-':
      case '_':
        this.zoomKeyboard(id, this._viewZoom / 1.5);
        break;
      case '0':
        this.resetZoom();
        break;
      default:
        this.handleTypeahead(event, id);
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /** Zoom anchored on a node's on-screen center (falls back to the chart center). */
  private zoomKeyboard(id: string, zoom: number): void {
    const target = this.shadowRoot?.querySelector(`[role="treeitem"][data-id="${cssEscape(id)}"]`);
    const chart = this.shadowRoot?.querySelector<HTMLElement>('.chart')?.getBoundingClientRect();
    const rect = target?.getBoundingClientRect();
    const anchor = chart?.width && rect?.width
      ? this.chartAnchor({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 })
      : { x: 0.5, y: 0.5 };
    this.setZoomLevel(zoom, anchor.x, anchor.y);
  }

  private handleTypeahead(event: KeyboardEvent, currentId: string): void {
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    clearTimeout(this._typeaheadTimer);
    this._typeahead += event.key.toLowerCase();
    this._typeaheadTimer = setTimeout(() => (this._typeahead = ''), 500) as unknown as number;
    const index = this._index;
    if (!index) return;
    const order = this._rendered;
    const from = order.findIndex((r) => r.id === currentId);
    const rotated = [...order.slice(from + 1), ...order.slice(0, from + 1)];
    const hit = rotated.find((r) => {
      const node = index.byId.get(r.id);
      return node ? this.labelText(node).toLowerCase().startsWith(this._typeahead) : false;
    });
    if (hit) {
      this._focusedId = hit.id;
      this._restoreFocus = true;
      this.requestUpdate();
      event.preventDefault();
    }
  }

  /**
   * Roving tabindex target for this render: the focused node while it is
   * still rendered, else the first rendered node (announcement rides the
   * zoom announce that caused the window to change).
   */
  private resolveTabFocus(): string | undefined {
    const stillThere = this._focusedId && this._rendered.some((r) => r.id === this._focusedId);
    if (!stillThere) {
      const fallback = this._rendered[0]?.id;
      const hadFocus = !!this.shadowRoot?.activeElement;
      this._focusedId = fallback ?? null;
      if (hadFocus && fallback) this._restoreFocus = true;
    }
    return this._focusedId ?? undefined;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (this._restoreFocus && this._focusedId) {
      this._restoreFocus = false;
      this.shadowRoot
        ?.querySelector<SVGElement | HTMLElement>(`[role="treeitem"][data-id="${cssEscape(this._focusedId)}"]`)
        ?.focus({ preventScroll: true });
    }
    this.loadLazyCandidates();
  }

  /* ---------- lazy children ---------- */

  private isLazy(node: HierarchyNode | undefined): node is HierarchyNode {
    return !!node && !!node.hasChildren && !node.children?.length && !this._loadedIds.has(node.id);
  }

  /** Kick a load for every lazy node whose CHILD ring is inside the rendered window. */
  private loadLazyCandidates(): void {
    const loader = this._loadChildren;
    const index = this._index;
    if (!loader || !index) return;
    const focus = this.focusedRoot;
    // Under `auto` the deepest rendered level is also a candidate — otherwise
    // the window can never grow past it and lazy loading deadlocks at level 1.
    // The consequence is deliberate and worth knowing: `max-depth="auto"` plus
    // `loadChildren` walks the entire tree, one level per render.
    const unbounded = this.maxDepth === 'auto';
    const depth = this.renderedDepth;
    const candidates = [
      ...(this.isLazy(focus) ? [focus] : []),
      ...this._rendered
        .filter((r) => unbounded || r.depth < depth)
        .map((r) => index.byId.get(r.id))
        .filter((node): node is HierarchyNode => this.isLazy(node)),
    ].filter((node) => !this._loadingIds.has(node.id) && !this._failedIds.has(node.id));

    candidates.map((node) => {
      this._loadingIds.add(node.id);
      if (node === focus) this.liveAnnouncer.announce(`${this._loadingLabel} ${this.labelText(node)}`);
      loader(node).then(
        (children) => {
          node.children = children;
          this._loadingIds.delete(node.id);
          this._loadedIds.add(node.id);
          // Re-rolls values and colorValues so the new ring sizes correctly.
          if (this._data) this._index = buildIndex(this._data);
          this.requestUpdate();
        },
        (error) => {
          this._loadingIds.delete(node.id);
          this._failedIds.add(node.id);
          this.emit<HierarchyLoadErrorEventDetail>('hierarchy-node-load-error', { node, error });
          this.requestUpdate();
        },
      );
      return node;
    });
    if (candidates.length) this.requestUpdate();
  }

  private fillOf(node: HierarchyNode): string | undefined {
    if (node.color) return node.color;
    const metric = this._index?.colorValues.get(node.id);
    return metric !== undefined ? this._fill(metric) : undefined;
  }

  private treeLabel(): string | null {
    return this.getAttribute('aria-label') ?? this._inputLabel;
  }

  /** The focus path as buttons, OUTSIDE any role=tree container (trees own only treeitems). */
  private renderBreadcrumb(index: HierarchyIndex, focus: HierarchyNode): TemplateResult {
    const path = pathTo(index, focus);
    return html`<nav class="breadcrumb" aria-label=${this._breadcrumbLabel}>
      ${path.map((node, i) =>
        i === path.length - 1
          ? html`<span class="crumb-current" aria-current="location">${this.labelText(node)}</span>`
          : html`<button
              type="button"
              class="crumb"
              @click=${() => this.zoomTo(node === index.root ? undefined : node.id)}
            >${this.labelText(node)}</button><span class="crumb-sep" aria-hidden="true">/</span>`)}
    </nav>`;
  }

  override render(): TemplateResult {
    const index = this._index;
    const focus = this.focusedRoot;
    if (!index || !focus) return html`<div class="chart"></div>`;

    return html`${this._showBreadcrumb ? this.renderBreadcrumb(index, focus) : nothing}<div
      class="chart ${this._gestures.has('pinch') ? 'pinch' : ''}"
      @click=${this.onClick}
      @keydown=${this.onKeyDown}
      @pointerdown=${this.onPointerDown}
      @pointermove=${this.onPointerMove}
      @pointerup=${this.endViewGesture}
      @pointercancel=${this.endViewGesture}
      @pointerleave=${this.clearHover}
      @focusin=${this.onFocusIn}
      @focusout=${this.onFocusOut}
    >
      ${this._layout === 'sunburst'
        ? this.renderSunburst(index)
        : this._layout === 'icicle'
          ? this.renderIcicle(index, focus)
          : this.renderTreemap(index, focus)}
      <div class="chart-tooltip" aria-hidden="true"></div>
      ${this._hintVisible && this._gestures.has('wheel')
        ? html`<div class="zoom-hint" aria-hidden="true">${this.zoomHintLabel}</div>`
        : nothing}
      ${this.liveAnnouncer.template()}
    </div>`;
  }

  private _tabFocusId: string | undefined;

  private captureRendered(nodes: Array<PartitionNode | RectNode>, focusId: string): void {
    this._rendered = nodes.map((n) => ({
      id: n.node.id,
      parentId: this._index?.parents.get(n.node.id)?.id ?? focusId,
      depth: n.depth,
    }));
    this._tabFocusId = this.resolveTabFocus();
  }

  /* ---------- sunburst ---------- */

  private renderSunburst(index: HierarchyIndex): TemplateResult {
    const focus = this.focusedRoot;
    const depth = this.renderedDepth;
    const nodes = partitionLayout(index, this._rootId, {
      maxDepth: depth,
      // The cull relaxes with magnification: a sliver you zoomed into is no
      // longer a sliver on screen.
      minFraction: this._minAngle / 360 / this._viewZoom,
    });
    // Rings fill the half-size: hole is 1 unit, ring d spans [d, d+1] units.
    const unit = VIEW / 2 / (depth + 1);
    const label = this.treeLabel();
    const spans = new Map(nodes.map((n) => [n.node.id, this.tweenedSpan(n)]));
    this._prevSpans = new Map(
      [...spans.entries()].map(([id, s]) => [id, { ...s, depth: 0 }]),
    );
    this.captureRendered(nodes, focus?.id ?? '');
    const atRoot = focus === index.root;
    const holePct = (100 / (depth + 1)) * 0.9;

    // The geometric view window IS the viewBox — no transform, no
    // re-rasterization, and label font-size (in viewBox units) divides by the
    // zoom so rendered text never scales.
    const z = this._viewZoom;
    const holeCenter = this.viewRect(0.5, 0.5, 0.5, 0.5);
    // The zoom-out control is a real HTML button OVERLAY, not a node inside
    // the svg: role=tree only allows treeitem/group children.
    return html`<svg
      viewBox="${this._viewX * VIEW} ${this._viewY * VIEW} ${VIEW / z} ${VIEW / z}"
      role="tree"
      aria-label=${label ?? nothing}
    >
      <!-- role=none: this group only centres the geometry, and an unroled node
           between role=tree and its treeitems is an aria-required-parent risk. -->
      <g role="none" transform="translate(${VIEW / 2},${VIEW / 2})">
        ${repeat(nodes, (n) => n.node.id, (n) => this.renderArc(n, spans.get(n.node.id) ?? n, unit))}
        ${this._showLabels && this._tween >= 1
          ? repeat(
              nodes
                .map((n) => ({ n, fit: this.arcLabelFit(n, unit) }))
                .filter(({ fit }) => fit.visible),
              ({ n }) => `label-${n.node.id}`,
              ({ n, fit }) => svg`<text
                class="arc-label"
                aria-hidden="true"
                font-size=${Math.round((this._labelFontSize / this.effectiveScale) * 100) / 100}
                data-surface=${this.surfaceToneOf(n.node, n.hasChildren ? 1 : 0.6)}
                transform=${arcLabelTransform(n.x0, n.x1, (n.depth + 0.5) * unit, fit.orientation)}
              >${fit.text}</text>`)
          : nothing}
      </g>
    </svg>
    <button
      class="center-control"
      aria-label=${this._zoomOutLabel}
      title=${atRoot ? nothing : this._zoomOutLabel}
      ?disabled=${atRoot}
      style=${styleMap({
        left: `${holeCenter.x0 * 100}%`,
        top: `${holeCenter.y0 * 100}%`,
        width: `${holePct * z}%`,
        height: `${holePct * z}%`,
      })}
      @click=${this.zoomOut}
    >${focus ? this.labelText(focus) : ''}</button>`;
  }

  private renderArc(n: PartitionNode, span: { x0: number; x1: number }, unit: number): TemplateResult {
    const d = arcPath(0, 0, n.depth * unit, (n.depth + 1) * unit, span.x0 * TAU, span.x1 * TAU, {
      padAngle: 0.005,
    });
    const fill = this.fillOf(n.node);
    return svg`<path
      class="ring"
      data-id=${n.node.id}
      ?data-leaf=${!n.hasChildren}
      ?data-loading=${this._loadingIds.has(n.node.id)}
      ?data-load-error=${this._failedIds.has(n.node.id)}
      d=${d}
      fill=${fill ?? 'var(--mp-hierarchy-chart-node-fill)'}
      role="treeitem"
      tabindex=${n.node.id === this._tabFocusId ? '0' : '-1'}
      aria-label=${this.accessibleName(n.node)}
      aria-level=${n.level}
      aria-setsize=${n.setsize}
      aria-posinset=${n.posinset}
      aria-expanded=${n.hasChildren ? String(n.depth < this.renderedDepth && !!n.node.children?.length) : nothing}
      aria-busy=${this._loadingIds.has(n.node.id) ? 'true' : nothing}
    ></path>`;
  }

  /**
   * Fit the (formatted) name into the arc IN DEVICE PX — the same 12px label
   * needs a bigger arc on a small host, and re-rooting is what makes arcs big
   * enough, so labels appear as you zoom in.
   */
  private arcLabelFit(n: PartitionNode, unit: number): ArcLabelFit {
    // effectiveScale folds in the geometric zoom: magnifying the chart is
    // what makes small segments' captions fit, at a constant font size.
    return fitArcLabel(
      this.labelText(n.node),
      (n.x1 - n.x0) * TAU,
      n.depth * unit * this.effectiveScale,
      (n.depth + 1) * unit * this.effectiveScale,
      this._labelFontSize,
    );
  }

  /* ---------- icicle ---------- */

  private renderIcicle(index: HierarchyIndex, focus: HierarchyNode): TemplateResult {
    const depth = this.renderedDepth;
    const nodes = partitionLayout(index, this._rootId, {
      maxDepth: depth,
      minFraction: this._minSize / VIEW / this._viewZoom,
    });
    const columns = depth + 1; // column 0 is the focus cell
    const label = this.treeLabel();
    this.captureRendered(nodes, focus.id);
    const focusRect = this.viewRect(0, 0, 1 / columns, 1);

    return html`<div class="icicle" role="tree" aria-label=${label ?? nothing}>
      <div
        class="cell focus-cell"
        data-id=${focus.id}
        data-surface=${this.toneOfSurface(undefined)}
        role="treeitem"
        tabindex="-1"
        aria-label=${this.accessibleName(focus)}
        aria-level=${levelOf(index, focus)}
        aria-setsize="1"
        aria-posinset="1"
        aria-expanded="true"
        title=${focus === index.root ? nothing : this._zoomOutLabel}
        style=${styleMap({ ...this.cellGeometry(focusRect), fontSize: `${this._labelFontSize}px` })}
      >${this._showLabels && this.cellLabelFits(focusRect)
        ? html`<span class="cell-label">${this.labelText(focus)}</span>`
        : nothing}</div>
      ${repeat(
        nodes,
        (n) => n.node.id,
        (n) => this.renderCell(n, this.viewRect(n.depth / columns, n.x0, (n.depth + 1) / columns, n.x1),
          n.hasChildren && n.depth < this.renderedDepth && !!n.node.children?.length))}
    </div>`;
  }

  /* ---------- treemap ---------- */

  private renderTreemap(index: HierarchyIndex, focus: HierarchyNode): TemplateResult {
    const depth = this.renderedDepth;
    const nodes = squarifyLayout(index, this._rootId, {
      maxDepth: depth,
      minArea: (this._minSize / VIEW) ** 2 / (this._viewZoom * this._viewZoom),
      childPadding: 0.004,
      childHeaderSpace: 0.028,
    });
    const label = this.treeLabel();
    const crumbs = pathTo(index, focus).map((n) => this.labelText(n)).join(' / ');
    this.captureRendered(nodes, focus.id);
    // Branch tiles are frames; painting order (parents first) keeps children on top.
    return html`<div class="treemap">
      <button
        class="treemap-header"
        aria-label=${this._zoomOutLabel}
        title=${crumbs}
        ?disabled=${focus === index.root}
        @click=${this.zoomOut}
      >${crumbs}</button>
      <div class="treemap-body" role="tree" aria-label=${label ?? nothing}>
        ${repeat(
          nodes,
          (n) => n.node.id,
          (n) => this.renderCell(n, this.viewRect(n.x0, n.y0, n.x1, n.y1),
            n.hasChildren && n.depth < this.renderedDepth && !!n.node.children?.length))}
      </div>
    </div>`;
  }

  private cellGeometry(rect: { x0: number; y0: number; x1: number; y1: number }): Record<string, string> {
    return {
      left: `${rect.x0 * 100}%`,
      top: `${rect.y0 * 100}%`,
      width: `${(rect.x1 - rect.x0) * 100}%`,
      height: `${(rect.y1 - rect.y0) * 100}%`,
    };
  }

  private cellLabelFits(rect: { x0: number; y0: number; x1: number; y1: number }): boolean {
    const side = VIEW * this._hostScale; // chart px (aspect-ratio 1); rect already includes the zoom
    return fitCellLabel((rect.x1 - rect.x0) * side, (rect.y1 - rect.y0) * side, this._labelFontSize);
  }

  private renderCell(
    n: PartitionNode | RectNode,
    rect: { x0: number; y0: number; x1: number; y1: number },
    expanded: boolean,
  ): TemplateResult {
    const branch = this._layout === 'treemap' && expanded;
    const fill = branch ? undefined : this.fillOf(n.node);
    const labeled = this._showLabels && this.cellLabelFits(rect);
    return html`<div
      class="cell"
      data-id=${n.node.id}
      ?data-leaf=${!n.hasChildren}
      ?data-branch=${branch}
      ?data-loading=${this._loadingIds.has(n.node.id)}
      ?data-load-error=${this._failedIds.has(n.node.id)}
      data-surface=${fill ? this.surfaceToneOf(n.node, 1) : this.toneOfSurface(undefined)}
      role="treeitem"
      tabindex=${n.node.id === this._tabFocusId ? '0' : '-1'}
      aria-label=${this.accessibleName(n.node)}
      aria-level=${n.level}
      aria-setsize=${n.setsize}
      aria-posinset=${n.posinset}
      aria-expanded=${n.hasChildren ? String(expanded) : nothing}
      aria-busy=${this._loadingIds.has(n.node.id) ? 'true' : nothing}
      style=${styleMap({
        ...this.cellGeometry(rect),
        fontSize: `${this._labelFontSize}px`,
        ...(fill ? { background: fill } : {}),
      })}
    >${labeled ? html`<span class="cell-label">${this.labelText(n.node)}</span>` : nothing}</div>`;
  }
}

/** Keep the view window inside the content: x in [0, 1 - 1/zoom]. */
function clampView(value: number, zoom: number): number {
  return Math.min(1 - 1 / zoom, Math.max(0, value));
}

/** Computed backgrounds are rgb()/rgba(); 'transparent' computes to rgba(0, 0, 0, 0). */
function isOpaqueColor(color: string): boolean {
  if (!color || color === 'transparent') return false;
  const alpha = color.match(/^rgba\([^)]+,\s*([\d.]+)\s*\)$/i)?.[1];
  if (alpha !== undefined) return Number(alpha) >= 1;
  return /^(rgb\(|#|hsl\()/i.test(color);
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-hierarchy-chart')) {
  customElements.define('mp-hierarchy-chart', MpHierarchyChart);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-hierarchy-chart': MpHierarchyChart;
  }
}
