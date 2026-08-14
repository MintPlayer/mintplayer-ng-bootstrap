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
  private _maxDepth: number | 'auto' = 2;
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
    this.requestUpdate();
  }

  get layout(): HierarchyChartLayout {
    return this._layout;
  }
  set layout(value: HierarchyChartLayout) {
    this._layout = value === 'icicle' || value === 'treemap' ? value : 'sunburst';
    this.requestUpdate();
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
   * level. Default 2 (codecov's window), which keeps the DOM small on a big
   * tree; any positive number is valid, and `'auto'` follows the data — with
   * lazy loading that means each arriving level reveals the next.
   */
  get maxDepth(): number | 'auto' {
    return this._maxDepth;
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
    if (this._maxDepth !== 'auto') return this._maxDepth;
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
      case 'max-depth': this.maxDepth = newValue === 'auto' ? 'auto' : Number(newValue ?? 2); break;
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
      case 'zoom-out-label': this._zoomOutLabel = newValue ?? 'Zoom out one level'; this.requestUpdate(); break;
      case 'loading-label': this._loadingLabel = newValue ?? 'Loading'; break;
      case 'metric-unit-label': this._metricUnitLabel = newValue ?? '%'; this.requestUpdate(); break;
      case 'value-unit-label': this._valueUnitLabel = newValue ?? ''; this.requestUpdate(); break;
      case 'aria-label': this.requestUpdate(); break;
      case 'input-label': this.inputLabel = newValue; break;
    }
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

  /* ---------- zoom ---------- */

  /** Re-root on a node id (undefined = tree root) and emit `hierarchy-zoom`. */
  zoomTo(id: string | undefined): void {
    const index = this._index;
    if (!index) return;
    const target = resolveFocus(index, id);
    if (target === this.focusedRoot) return;
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

  private onPointerMove(event: PointerEvent): void {
    const index = this._index;
    if (!index) return;
    const node = this.nodeFromEvent(event);
    const tooltip = this.shadowRoot?.querySelector<HTMLElement>('.chart-tooltip');
    if (!node || node === this.focusedRoot) {
      this.clearHover();
      return;
    }
    if (tooltip) {
      const chart = this.shadowRoot?.querySelector<HTMLElement>('.chart');
      const rect = chart?.getBoundingClientRect();
      if (rect) {
        tooltip.style.left = `${event.clientX - rect.left + 12}px`;
        tooltip.style.top = `${event.clientY - rect.top + 12}px`;
      }
      tooltip.textContent = this.tooltipText(node);
      tooltip.setAttribute('data-visible', '');
    }
    if (this._hoveredId !== node.id) {
      this._hoveredId = node.id;
      this.emit<HierarchyHoverEventDetail>('hierarchy-node-hover', { node, path: pathTo(index, node) });
    }
  }

  private clearHover(): void {
    this.shadowRoot?.querySelector('.chart-tooltip')?.removeAttribute('data-visible');
    if (this._hoveredId !== null) {
      this._hoveredId = null;
      this.emit<HierarchyHoverEventDetail>('hierarchy-node-hover', { node: null, path: [] });
    }
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
      case 'Backspace':
        if (this.focusedRoot === this._index?.root) return; // nothing to close: let Escape bubble
        this.zoomOut();
        break;
      default:
        this.handleTypeahead(event, id);
        return;
    }
    event.preventDefault();
    event.stopPropagation();
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
    const unbounded = this._maxDepth === 'auto';
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

  override render(): TemplateResult {
    const index = this._index;
    const focus = this.focusedRoot;
    if (!index || !focus) return html`<div class="chart"></div>`;

    return html`<div
      class="chart"
      @click=${this.onClick}
      @keydown=${this.onKeyDown}
      @pointermove=${this.onPointerMove}
      @pointerleave=${this.clearHover}
    >
      ${this._layout === 'sunburst'
        ? this.renderSunburst(index)
        : this._layout === 'icicle'
          ? this.renderIcicle(index, focus)
          : this.renderTreemap(index, focus)}
      <div class="chart-tooltip" aria-hidden="true"></div>
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
      minFraction: this._minAngle / 360,
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

    // The zoom-out control is a real HTML button OVERLAY, not a node inside
    // the svg: role=tree only allows treeitem/group children.
    return html`<svg viewBox="0 0 ${VIEW} ${VIEW}" role="tree" aria-label=${label ?? nothing}>
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
                font-size=${Math.round((this._labelFontSize / this._hostScale) * 100) / 100}
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
      style=${styleMap({ width: `${holePct}%`, height: `${holePct}%` })}
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
    return fitArcLabel(
      this.labelText(n.node),
      (n.x1 - n.x0) * TAU,
      n.depth * unit * this._hostScale,
      (n.depth + 1) * unit * this._hostScale,
      this._labelFontSize,
    );
  }

  /* ---------- icicle ---------- */

  private renderIcicle(index: HierarchyIndex, focus: HierarchyNode): TemplateResult {
    const depth = this.renderedDepth;
    const nodes = partitionLayout(index, this._rootId, {
      maxDepth: depth,
      minFraction: this._minSize / VIEW,
    });
    const columns = depth + 1; // column 0 is the focus cell
    const label = this.treeLabel();
    this.captureRendered(nodes, focus.id);

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
        style=${styleMap({
          left: '0%', top: '0%', width: `${100 / columns}%`, height: '100%',
          fontSize: `${this._labelFontSize}px`,
        })}
      >${this._showLabels && fitCellLabel((1 / columns) * VIEW * this._hostScale, VIEW * this._hostScale, this._labelFontSize)
        ? html`<span class="cell-label">${this.labelText(focus)}</span>`
        : nothing}</div>
      ${repeat(nodes, (n) => n.node.id, (n) => this.renderCell(n, {
        left: `${(n.depth / columns) * 100}%`,
        top: `${n.x0 * 100}%`,
        width: `${(1 / columns) * 100}%`,
        height: `${(n.x1 - n.x0) * 100}%`,
      }, n.hasChildren && n.depth < this.renderedDepth && !!n.node.children?.length,
        1 / columns, n.x1 - n.x0))}
    </div>`;
  }

  /* ---------- treemap ---------- */

  private renderTreemap(index: HierarchyIndex, focus: HierarchyNode): TemplateResult {
    const depth = this.renderedDepth;
    const nodes = squarifyLayout(index, this._rootId, {
      maxDepth: depth,
      minArea: (this._minSize / VIEW) ** 2,
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
        ${repeat(nodes, (n) => n.node.id, (n) => this.renderCell(n, {
          left: `${n.x0 * 100}%`,
          top: `${n.y0 * 100}%`,
          width: `${(n.x1 - n.x0) * 100}%`,
          height: `${(n.y1 - n.y0) * 100}%`,
        }, n.hasChildren && n.depth < this.renderedDepth && !!n.node.children?.length,
          n.x1 - n.x0, n.y1 - n.y0))}
      </div>
    </div>`;
  }

  private renderCell(
    n: PartitionNode | RectNode,
    geometry: Readonly<Record<string, string>>,
    expanded: boolean,
    widthFraction: number,
    heightFraction: number,
  ): TemplateResult {
    const branch = this._layout === 'treemap' && expanded;
    const fill = branch ? undefined : this.fillOf(n.node);
    const side = VIEW * this._hostScale; // host px (aspect-ratio 1)
    const labeled = this._showLabels
      && fitCellLabel(widthFraction * side, heightFraction * side, this._labelFontSize);
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
        ...geometry,
        fontSize: `${this._labelFontSize}px`,
        ...(fill ? { background: fill } : {}),
      })}
    >${labeled ? html`<span class="cell-label">${this.labelText(n.node)}</span>` : nothing}</div>`;
  }
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
