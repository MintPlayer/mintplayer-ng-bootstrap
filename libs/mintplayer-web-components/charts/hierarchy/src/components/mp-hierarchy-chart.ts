import { LitElement, html, svg, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { LiveAnnouncerController } from '@mintplayer/web-components/a11y';
import {
  buildIndex,
  colorScale,
  arcPath,
  arcLabelTransform,
  arcLabelVisible,
  partitionLayout,
  squarifyLayout,
  resolveFocus,
  levelOf,
  pathTo,
  type HierarchyHoverEventDetail,
  type HierarchyIndex,
  type HierarchyNode,
  type HierarchyNodeEventDetail,
  type PartitionNode,
  type RectNode,
} from '@mintplayer/web-components/charts/core';
import { hierarchyChartStyles } from '../styles';

export type HierarchyChartLayout = 'sunburst' | 'icicle' | 'treemap';

/** String-returning formatters; return `undefined` to fall back to the built-in text. */
export type HierarchyNodeFormatter = (node: HierarchyNode) => string | undefined;

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
 *   `label-min-area`, `color-min`, `color-max`, `color-start`, `color-end`
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
      'label-min-area',
      'color-min',
      'color-max',
      'color-start',
      'color-end',
      'transition-duration',
      'locale',
      'zoom-out-label',
      'metric-unit-label',
      'value-unit-label',
      // Copied onto the in-shadow role=tree node — the host stays generic.
      'aria-label',
      'input-label',
    ];
  }

  private _data: HierarchyNode | undefined;
  private _index: HierarchyIndex | undefined;
  private _layout: HierarchyChartLayout = 'sunburst';
  private _rootId: string | undefined;
  private _maxDepth = 2;
  private _minAngle = 0.2; // degrees
  private _minSize = 4; // logical px (of the 1000-unit square), cartesian cull
  private _showLabels = true;
  private _labelMinArea = 0.03; // Observable's rings x radians threshold
  private _colorMin = 0;
  private _colorMax = 100;
  private _colorStart = '#fe0000';
  private _colorEnd = '#21b577';
  private _inputLabel: string | null = null;
  private _transitionDuration = 300;
  private _locale: string | undefined;
  private _tooltipFormatter: HierarchyNodeFormatter | undefined;
  private _labelFormatter: HierarchyNodeFormatter | undefined;

  private _fill = colorScale(this._colorMin, this._colorMax, this._colorStart, this._colorEnd);

  /** Sunburst tween: spans of the previous render, and progress 0..1 (1 = settled). */
  private _prevSpans = new Map<string, { x0: number; x1: number; depth: number }>();
  private _tween = 1;
  private _tweenFrame = 0;
  private _hoveredId: string | null = null;

  // Roving tabindex over the rendered treeitems (one tab stop for the tree).
  private _focusedId: string | null = null;
  private _restoreFocus = false;
  private _rendered: Array<{ id: string; parentId: string | null }> = [];
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

  get maxDepth(): number {
    return this._maxDepth;
  }
  set maxDepth(value: number) {
    this._maxDepth = Math.max(1, Math.floor(Number(value) || 2));
    this.requestUpdate();
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

  get labelMinArea(): number {
    return this._labelMinArea;
  }
  set labelMinArea(value: number) {
    this._labelMinArea = Math.max(0, Number(value) || 0);
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

  private rebuildScale(): void {
    this._fill = colorScale(this._colorMin, this._colorMax, this._colorStart, this._colorEnd);
    this.requestUpdate();
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case 'layout': this.layout = (newValue ?? 'sunburst') as HierarchyChartLayout; break;
      case 'root-id': this.rootId = newValue ?? undefined; break;
      case 'max-depth': this.maxDepth = Number(newValue ?? 2); break;
      case 'min-angle': this.minAngle = Number(newValue ?? 0.2); break;
      case 'min-size': this.minSize = Number(newValue ?? 4); break;
      case 'show-labels': this.showLabels = newValue !== 'false' && newValue !== null; break;
      case 'label-min-area': this.labelMinArea = Number(newValue ?? 0.03); break;
      case 'color-min': this.colorMin = Number(newValue ?? 0); break;
      case 'color-max': this.colorMax = Number(newValue ?? 100); break;
      case 'color-start': this.colorStart = newValue ?? '#fe0000'; break;
      case 'color-end': this.colorEnd = newValue ?? '#21b577'; break;
      case 'transition-duration': this.transitionDuration = Number(newValue ?? 300); break;
      case 'locale': this.locale = newValue ?? undefined; break;
      case 'zoom-out-label': this._zoomOutLabel = newValue ?? 'Zoom out one level'; this.requestUpdate(); break;
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
    if (node.children?.length) {
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
        if (node === this.focusedRoot) this.zoomOut();
        else if (node.children?.length) this.zoomTo(node.id);
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
    }));
    this._tabFocusId = this.resolveTabFocus();
  }

  /* ---------- sunburst ---------- */

  private renderSunburst(index: HierarchyIndex): TemplateResult {
    const focus = this.focusedRoot;
    const nodes = partitionLayout(index, this._rootId, {
      maxDepth: this._maxDepth,
      minFraction: this._minAngle / 360,
    });
    // Rings fill the half-size: hole is 1 unit, ring d spans [d, d+1] units.
    const unit = VIEW / 2 / (this._maxDepth + 1);
    const label = this.treeLabel();
    const spans = new Map(nodes.map((n) => [n.node.id, this.tweenedSpan(n)]));
    this._prevSpans = new Map(
      [...spans.entries()].map(([id, s]) => [id, { ...s, depth: 0 }]),
    );
    this.captureRendered(nodes, focus?.id ?? '');
    const atRoot = focus === index.root;
    const holePct = (100 / (this._maxDepth + 1)) * 0.9;

    // The zoom-out control is a real HTML button OVERLAY, not a node inside
    // the svg: role=tree only allows treeitem/group children.
    return html`<svg viewBox="0 0 ${VIEW} ${VIEW}" role="tree" aria-label=${label ?? nothing}>
      <g transform="translate(${VIEW / 2},${VIEW / 2})">
        ${repeat(nodes, (n) => n.node.id, (n) => this.renderArc(n, spans.get(n.node.id) ?? n, unit))}
        ${this._showLabels && this._tween >= 1
          ? repeat(nodes.filter((n) => this.arcLabelFits(n)), (n) => `label-${n.node.id}`,
              (n) => svg`<text class="arc-label" transform=${arcLabelTransform(n.x0, n.x1, (n.depth + 0.5) * unit)}>${this.labelText(n.node)}</text>`)
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
      d=${d}
      fill=${fill ?? 'var(--mp-hierarchy-chart-node-fill)'}
      role="treeitem"
      tabindex=${n.node.id === this._tabFocusId ? '0' : '-1'}
      aria-label=${this.accessibleName(n.node)}
      aria-level=${n.level}
      aria-setsize=${n.setsize}
      aria-posinset=${n.posinset}
      aria-expanded=${n.hasChildren ? String(n.depth < this._maxDepth && !!n.node.children?.length) : nothing}
    ></path>`;
  }

  private arcLabelFits(n: PartitionNode): boolean {
    return arcLabelVisible(n.x0 * TAU, n.x1 * TAU, 1, this._labelMinArea);
  }

  /* ---------- icicle ---------- */

  private renderIcicle(index: HierarchyIndex, focus: HierarchyNode): TemplateResult {
    const nodes = partitionLayout(index, this._rootId, {
      maxDepth: this._maxDepth,
      minFraction: this._minSize / VIEW,
    });
    const columns = this._maxDepth + 1; // column 0 is the focus cell
    const label = this.treeLabel();
    this.captureRendered(nodes, focus.id);

    return html`<div class="icicle" role="tree" aria-label=${label ?? nothing}>
      <div
        class="cell focus-cell"
        data-id=${focus.id}
        role="treeitem"
        tabindex="-1"
        aria-label=${this.accessibleName(focus)}
        aria-level=${levelOf(index, focus)}
        aria-setsize="1"
        aria-posinset="1"
        aria-expanded="true"
        title=${focus === index.root ? nothing : this._zoomOutLabel}
        style=${styleMap({ left: '0%', top: '0%', width: `${100 / columns}%`, height: '100%' })}
      ><span class="cell-label">${this.labelText(focus)}</span></div>
      ${repeat(nodes, (n) => n.node.id, (n) => this.renderCell(n, {
        left: `${(n.depth / columns) * 100}%`,
        top: `${n.x0 * 100}%`,
        width: `${(1 / columns) * 100}%`,
        height: `${(n.x1 - n.x0) * 100}%`,
      }, n.hasChildren && n.depth < this._maxDepth && !!n.node.children?.length))}
    </div>`;
  }

  /* ---------- treemap ---------- */

  private renderTreemap(index: HierarchyIndex, focus: HierarchyNode): TemplateResult {
    const nodes = squarifyLayout(index, this._rootId, {
      maxDepth: this._maxDepth,
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
        }, n.hasChildren && n.depth < this._maxDepth && !!n.node.children?.length))}
      </div>
    </div>`;
  }

  private renderCell(
    n: PartitionNode | RectNode,
    geometry: Readonly<Record<string, string>>,
    expanded: boolean,
  ): TemplateResult {
    const branch = this._layout === 'treemap' && expanded;
    const fill = branch ? undefined : this.fillOf(n.node);
    return html`<div
      class="cell"
      data-id=${n.node.id}
      ?data-leaf=${!n.hasChildren}
      ?data-branch=${branch}
      role="treeitem"
      tabindex=${n.node.id === this._tabFocusId ? '0' : '-1'}
      aria-label=${this.accessibleName(n.node)}
      aria-level=${n.level}
      aria-setsize=${n.setsize}
      aria-posinset=${n.posinset}
      aria-expanded=${n.hasChildren ? String(expanded) : nothing}
      style=${styleMap({ ...geometry, ...(fill ? { background: fill } : {}) })}
    ><span class="cell-label">${this.labelText(n.node)}</span></div>`;
  }
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
