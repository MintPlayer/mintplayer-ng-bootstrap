import { LitElement, html, svg, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
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
  type HierarchyIndex,
  type HierarchyNode,
  type PartitionNode,
  type RectNode,
} from '@mintplayer/web-components/charts/core';
import { hierarchyChartStyles } from '../styles';

export type HierarchyChartLayout = 'sunburst' | 'icicle' | 'treemap';

const VIEW = 1000; // logical viewBox size; all geometry is in these units
const TAU = 2 * Math.PI;

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

  private _fill = colorScale(this._colorMin, this._colorMax, this._colorStart, this._colorEnd);

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
    this._rootId = value || undefined;
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
      case 'aria-label': this.requestUpdate(); break;
      case 'input-label': this.inputLabel = newValue; break;
    }
  }

  /** The node the chart is rooted on right now (tree root when root-id is unset). */
  private get focusNode(): HierarchyNode | undefined {
    return this._index ? resolveFocus(this._index, this._rootId) : undefined;
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
    const focus = this.focusNode;
    if (!index || !focus) return html`<div class="chart"></div>`;

    return html`<div class="chart">
      ${this._layout === 'sunburst'
        ? this.renderSunburst(index)
        : this._layout === 'icicle'
          ? this.renderIcicle(index, focus)
          : this.renderTreemap(index, focus)}
    </div>`;
  }

  /* ---------- sunburst ---------- */

  private renderSunburst(index: HierarchyIndex): TemplateResult {
    const nodes = partitionLayout(index, this._rootId, {
      maxDepth: this._maxDepth,
      minFraction: this._minAngle / 360,
    });
    // Rings fill the half-size: hole is 1 unit, ring d spans [d, d+1] units.
    const unit = VIEW / 2 / (this._maxDepth + 1);
    const label = this.treeLabel();

    return html`<svg viewBox="0 0 ${VIEW} ${VIEW}" role="tree" aria-label=${label ?? nothing}>
      <g transform="translate(${VIEW / 2},${VIEW / 2})">
        ${repeat(nodes, (n) => n.node.id, (n) => this.renderArc(n, unit))}
        ${this._showLabels
          ? repeat(nodes.filter((n) => this.arcLabelFits(n)), (n) => `label-${n.node.id}`,
              (n) => svg`<text class="arc-label" transform=${arcLabelTransform(n.x0, n.x1, (n.depth + 0.5) * unit)}>${n.node.name}</text>`)
          : nothing}
        <circle class="center" r=${unit * 0.95}></circle>
        <text class="center-label">${this.focusNode?.name ?? ''}</text>
      </g>
    </svg>`;
  }

  private renderArc(n: PartitionNode, unit: number): TemplateResult {
    const d = arcPath(0, 0, n.depth * unit, (n.depth + 1) * unit, n.x0 * TAU, n.x1 * TAU, {
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
      aria-label=${n.node.name}
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

    return html`<div class="icicle" role="tree" aria-label=${label ?? nothing}>
      <div
        class="cell focus-cell"
        data-id=${focus.id}
        role="treeitem"
        aria-label=${focus.name}
        aria-level=${levelOf(index, focus)}
        aria-setsize="1"
        aria-posinset="1"
        aria-expanded="true"
        style=${styleMap({ left: '0%', top: '0%', width: `${100 / columns}%`, height: '100%' })}
      ><span class="cell-label">${focus.name}</span></div>
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
    // Branch tiles are frames; painting order (parents first) keeps children on top.
    return html`<div class="treemap" role="tree" aria-label=${label ?? nothing}>
      ${repeat(nodes, (n) => n.node.id, (n) => this.renderCell(n, {
        left: `${n.x0 * 100}%`,
        top: `${n.y0 * 100}%`,
        width: `${(n.x1 - n.x0) * 100}%`,
        height: `${(n.y1 - n.y0) * 100}%`,
      }, n.hasChildren && n.depth < this._maxDepth && !!n.node.children?.length))}
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
      aria-label=${n.node.name}
      aria-level=${n.level}
      aria-setsize=${n.setsize}
      aria-posinset=${n.posinset}
      aria-expanded=${n.hasChildren ? String(expanded) : nothing}
      style=${styleMap({ ...geometry, ...(fill ? { background: fill } : {}) })}
    ><span class="cell-label">${n.node.name}</span></div>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-hierarchy-chart')) {
  customElements.define('mp-hierarchy-chart', MpHierarchyChart);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-hierarchy-chart': MpHierarchyChart;
  }
}
