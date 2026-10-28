import type { CoreBag } from '@mintplayer/ui-core/component';
import {
  arcLabelTransform,
  arcPath,
  buildIndex,
  colorScale,
  composite,
  contrastText,
  fitArcLabel,
  fitCellLabel,
  levelOf,
  partitionLayout,
  pathTo,
  projectRect,
  resolveFocus,
  squarifyLayout,
  subtreeDepth,
  type HierarchyIndex,
  type HierarchyNode,
  type PartitionNode,
  type RectNode,
  type ViewWindow,
} from '@mintplayer/ui-core/charts/core';

/**
 * The hierarchy chart (#437): one weighted tree, three projections (sunburst,
 * icicle, treemap) over a shared data model, colour scale, focus and ARIA tree.
 *
 * Arc size follows the summed LEAF `value` (never the colour metric: sizing by
 * a percentage inverts salience, PRD charts-wc §1.1); colour follows
 * `colorValue` through a clamped two-stop scale.
 *
 * Two kinds of zoom, deliberately distinct:
 * - SEMANTIC re-root (click, Enter, tap, breadcrumb): the subtree takes the
 *   whole chart; two-way through `rootId`.
 * - GEOMETRIC magnification (ctrl/cmd+wheel, pinch, `+`/`-`/`0`, drag pan): a
 *   view window mapped through the sunburst's viewBox and the cells'
 *   percentages, never a CSS transform. Labels hold their device-px size, so
 *   magnifying is what reveals small segments' captions.
 *
 * Every function here is pure; `hierarchy.core.ts` owns the DOM.
 */
export const HIERARCHY_CHART_SCOPE = 'hierarchy-chart';

/** Logical viewBox size: all geometry is in these units. */
export const HIERARCHY_VIEW = 1000;

/**
 * Device px per viewBox unit before the chart is measured: a representative
 * 420px host (PRD S6). The server renders at it, and so does jsdom.
 */
export const FALLBACK_HOST_SCALE = 0.42;

const TAU = 2 * Math.PI;

export type HierarchyChartLayout = 'sunburst' | 'icicle' | 'treemap';

/** String-returning formatters; return `undefined` to fall back to the built-in text. */
export type HierarchyNodeFormatter = (node: HierarchyNode) => string | undefined;

/**
 * Async loader for a lazy node's children (a node with `hasChildren: true` and
 * no `children`). Called once per node when its child ring would enter the
 * rendered window; reject to surface a `nodeLoadError` (activating the node
 * again retries). Matches codecov's report/tree API shape (depth + path).
 */
export type HierarchyChildrenLoader = (node: HierarchyNode) => Promise<HierarchyNode[]>;

export type HierarchyBag = CoreBag;

const scoped = (bag: HierarchyBag): HierarchyBag => ({ ...bag, 'data-mps': HIERARCHY_CHART_SCOPE });

/* ---------- index ---------- */

const indexes = new WeakMap<HierarchyNode, { version: number; index: HierarchyIndex }>();

/**
 * The tree, rolled up once per data write. `version` changes when a lazy load
 * mutated the tree in place, which is the only other reason to re-roll.
 */
export function hierarchyIndex(data: HierarchyNode | null | undefined, version: number): HierarchyIndex | undefined {
  if (!data) return undefined;
  const hit = indexes.get(data);
  if (hit && hit.version === version) return hit.index;
  const index = buildIndex(data);
  indexes.set(data, { version, index });
  return index;
}

export const normalizeLayout = (layout: string | null | undefined): HierarchyChartLayout =>
  layout === 'icicle' || layout === 'treemap' ? layout : 'sunburst';

/**
 * `maxDepth` as configured: a positive whole number, or `'auto'` for every
 * loaded level. Unset is `'auto'`, except with a loader: `'auto'` treats the
 * deepest ring as a load candidate, so an unbounded lazy chart would walk the
 * whole remote tree one level per render. Lazy charts keep codecov's bounded
 * two-level window unless the consumer asks for `'auto'` and means it.
 */
export function configuredDepth(maxDepth: number | string | null | undefined, lazy: boolean): number | 'auto' {
  if (maxDepth === null || maxDepth === undefined || maxDepth === '') return lazy ? 2 : 'auto';
  if (maxDepth === 'auto') return 'auto';
  return Math.max(1, Math.floor(Number(maxDepth) || 2));
}

/**
 * The configured depth resolved against the data. Never 0: a leaf focus still
 * draws its (empty) first ring.
 */
export function renderedDepth(configured: number | 'auto', index: HierarchyIndex | undefined, rootId: string | null): number {
  if (configured !== 'auto') return configured;
  return index ? Math.max(1, subtreeDepth(index, rootId ?? undefined)) : 1;
}

/* ---------- the rendered window ---------- */

export interface WindowOptions {
  readonly index: HierarchyIndex | undefined;
  readonly layout: HierarchyChartLayout;
  readonly rootId: string | null;
  readonly depth: number;
  readonly view: ViewWindow;
  /** Degrees; the sunburst's cull. */
  readonly minAngle: number;
  /** Logical px; the icicle's and treemap's cull. */
  readonly minSize: number;
}

export type WindowNode = PartitionNode | RectNode;

/** The nodes this render draws, in the layout's paint order (parents first). */
export function windowNodes(o: WindowOptions): WindowNode[] {
  if (!o.index) return [];
  const focusId = o.rootId ?? undefined;
  // The culls relax with magnification: a sliver zoomed into is no longer a sliver on screen.
  if (o.layout === 'treemap') {
    return squarifyLayout(o.index, focusId, {
      maxDepth: o.depth,
      minArea: (o.minSize / HIERARCHY_VIEW) ** 2 / (o.view.zoom * o.view.zoom),
      childPadding: 0.004,
      childHeaderSpace: 0.028,
    });
  }
  return partitionLayout(o.index, focusId, {
    maxDepth: o.depth,
    minFraction: o.layout === 'sunburst' ? o.minAngle / 360 / o.view.zoom : o.minSize / HIERARCHY_VIEW / o.view.zoom,
  });
}

export interface WindowEntry {
  readonly id: string;
  readonly parentId: string | null;
  readonly depth: number;
}

/** The rendered treeitems, for keyboard moves and lazy loading. */
export function windowEntries(index: HierarchyIndex | undefined, nodes: readonly WindowNode[], focusId: string): WindowEntry[] {
  return nodes.map((n) => ({ id: n.node.id, parentId: index?.parents.get(n.node.id)?.id ?? focusId, depth: n.depth }));
}

/** The roving tab stop: the focused node while it is still rendered, else the first rendered one. */
export function tabStop(entries: readonly WindowEntry[], focusedId: string | null): string | null {
  return focusedId !== null && entries.some((e) => e.id === focusedId) ? focusedId : (entries[0]?.id ?? null);
}

/** A sunburst span as drawn: interpolated from the previous render while a re-root tweens. */
export function tweenedSpan(
  n: PartitionNode,
  tween: number,
  from: Readonly<Record<string, { x0: number; x1: number }>> | null,
): { x0: number; x1: number } {
  if (tween >= 1 || !from) return { x0: n.x0, x1: n.x1 };
  const t = 1 - (1 - tween) * (1 - tween);
  // An entering arc grows out of its own start edge.
  const prev = from[n.node.id] ?? { x0: n.x0, x1: n.x0 };
  return { x0: prev.x0 + (n.x0 - prev.x0) * t, x1: prev.x1 + (n.x1 - prev.x1) * t };
}

/* ---------- text ---------- */

export interface TextOptions {
  readonly index: HierarchyIndex | undefined;
  readonly locale: string | undefined;
  readonly labelFormatter?: HierarchyNodeFormatter | null;
  readonly tooltipFormatter?: HierarchyNodeFormatter | null;
  readonly metricUnitLabel: string;
  readonly valueUnitLabel: string;
}

export const labelText = (o: Pick<TextOptions, 'labelFormatter'>, node: HierarchyNode): string =>
  o.labelFormatter?.(node) ?? node.name;

const numbersOf = (o: TextOptions) => new Intl.NumberFormat(o.locale);

/** Localized per-node accessible name: "components, 82%, 1,234 lines". */
export function accessibleName(o: TextOptions, node: HierarchyNode): string {
  const numbers = numbersOf(o);
  const metric = o.index?.colorValues.get(node.id);
  const value = o.index?.values.get(node.id);
  return [
    labelText(o, node),
    metric !== undefined ? `${numbers.format(Math.round(metric * 10) / 10)}${o.metricUnitLabel}` : undefined,
    value !== undefined && value > 0 ? `${numbers.format(value)}${o.valueUnitLabel ? ` ${o.valueUnitLabel}` : ''}` : undefined,
  ].filter((part): part is string => part !== undefined).join(', ');
}

export function tooltipText(o: TextOptions, node: HierarchyNode): string {
  const custom = o.tooltipFormatter?.(node);
  if (custom !== undefined) return custom;
  const numbers = numbersOf(o);
  const metric = o.index?.colorValues.get(node.id);
  const value = o.index?.values.get(node.id);
  return [
    node.name,
    metric !== undefined ? `${numbers.format(Math.round(metric * 10) / 10)}%` : undefined,
    value !== undefined && value > 0 ? numbers.format(value) : undefined,
  ].filter((part): part is string => part !== undefined).join(' — ');
}

/* ---------- the view ---------- */

export interface HierarchyTooltip {
  readonly text: string;
  readonly left: number;
  readonly top: number;
}

export interface HierarchyChartOptions extends TextOptions, Omit<WindowOptions, 'depth'> {
  readonly maxDepth: number | 'auto';
  readonly showLabels: boolean;
  /** Device px, constant across host size and zoom. */
  readonly labelFontSize: number;
  /** The opaque surface behind the chart; labels contrast against fill composited over it. */
  readonly backdrop: string;
  readonly colorMin: number;
  readonly colorMax: number;
  readonly colorStart: string;
  readonly colorEnd: string;
  /** Device px per viewBox unit. */
  readonly hostScale: number;
  readonly tween: number;
  readonly tweenFrom: Readonly<Record<string, { x0: number; x1: number }>> | null;
  readonly transitionDuration: number;
  readonly focusedId: string | null;
  readonly loading: readonly string[];
  readonly failed: readonly string[];
  readonly pinch: boolean;
  readonly hint: string | null;
  readonly tooltip: HierarchyTooltip | null;
  readonly announcement: string;
  readonly showBreadcrumb: boolean;
  readonly breadcrumbLabel: string;
  readonly zoomOutLabel: string;
  /** The tree's accessible name. */
  readonly label: string | null;
  /** Interactive: false on the server, where a control that cannot act must not look enabled. */
  readonly live: boolean;
}

export interface HierarchyCellView {
  readonly key: string;
  readonly bag: HierarchyBag;
  readonly style: Record<string, string>;
  readonly label: string | null;
}

export interface HierarchyCrumbView {
  readonly key: string;
  /** The current node (not a button), or null. */
  readonly current: HierarchyBag | null;
  /** A button back up to this node, or null. */
  readonly button: HierarchyBag | null;
  /** The separator after a button, or null. */
  readonly sep: HierarchyBag | null;
  readonly text: string;
}

export interface HierarchyChartView {
  readonly root: HierarchyBag;
  readonly breadcrumb: { readonly nav: HierarchyBag; readonly items: readonly HierarchyCrumbView[] } | null;
  readonly chart: HierarchyBag;
  readonly chartStyle: Record<string, string>;
  readonly sunburst: {
    readonly svg: HierarchyBag;
    readonly g: HierarchyBag;
    readonly arcs: readonly { readonly key: string; readonly bag: HierarchyBag }[];
    readonly labels: readonly { readonly key: string; readonly bag: HierarchyBag; readonly text: string }[];
    readonly center: { readonly bag: HierarchyBag; readonly style: Record<string, string>; readonly text: string };
  } | null;
  readonly icicle: { readonly tree: HierarchyBag; readonly focus: HierarchyCellView; readonly cells: readonly HierarchyCellView[] } | null;
  readonly treemap: {
    readonly wrap: HierarchyBag;
    readonly header: { readonly bag: HierarchyBag; readonly text: string };
    readonly body: HierarchyBag;
    readonly cells: readonly HierarchyCellView[];
  } | null;
  readonly cellLabel: HierarchyBag;
  readonly tooltip: { readonly bag: HierarchyBag; readonly style: Record<string, string>; readonly text: string };
  readonly hint: { readonly bag: HierarchyBag; readonly text: string } | null;
  readonly live: HierarchyBag;
  readonly announcement: string;
}

type Rect = { x0: number; y0: number; x1: number; y1: number };

const percent = (v: number) => `${v * 100}%`;
const geometry = (r: Rect): Record<string, string> => ({
  left: percent(r.x0),
  top: percent(r.y0),
  width: percent(r.x1 - r.x0),
  height: percent(r.y1 - r.y0),
});

const flag = (on: boolean): string | null => (on ? '' : null);

/** 'dark' TEXT reads best on a 'light' SURFACE and vice versa. */
function toneOfSurface(surface: string | undefined, backdrop: string): 'light' | 'dark' {
  const text = (surface !== undefined ? contrastText(surface) : undefined) ?? contrastText(backdrop) ?? 'dark';
  return text === 'dark' ? 'light' : 'dark';
}

export function connectHierarchyChart(o: HierarchyChartOptions): HierarchyChartView {
  const index = o.index;
  const focus = index ? resolveFocus(index, o.rootId ?? undefined) : undefined;
  const scale = colorScale(o.colorMin, o.colorMax, o.colorStart, o.colorEnd);
  const fillOf = (node: HierarchyNode): string | undefined => {
    if (node.color) return node.color;
    const metric = index?.colorValues.get(node.id);
    return metric !== undefined ? scale(metric) : undefined;
  };
  const surfaceOf = (node: HierarchyNode, opacity: number) => {
    const fill = fillOf(node);
    return toneOfSurface(fill ? composite(fill, o.backdrop, opacity) : undefined, o.backdrop);
  };

  const depth = renderedDepth(o.maxDepth, index, o.rootId);
  const nodes = windowNodes({ ...o, depth });
  const entries = windowEntries(index, nodes, focus?.id ?? '');
  const tab = o.live ? tabStop(entries, o.focusedId) : null;
  const atRoot = !focus || focus === index?.root;
  const effectiveScale = o.hostScale * o.view.zoom;
  const loading = new Set(o.loading);
  const failed = new Set(o.failed);
  const expanded = (n: WindowNode) => n.hasChildren && n.depth < depth && !!n.node.children?.length;

  const treeitem = (n: WindowNode): HierarchyBag => ({
    'data-id': n.node.id,
    'data-leaf': flag(!n.hasChildren),
    'data-loading': flag(loading.has(n.node.id)),
    'data-load-error': flag(failed.has(n.node.id)),
    role: 'treeitem',
    tabindex: tab === null ? null : n.node.id === tab ? '0' : '-1',
    'aria-label': accessibleName(o, n.node),
    'aria-level': n.level,
    'aria-setsize': n.setsize,
    'aria-posinset': n.posinset,
    'aria-expanded': n.hasChildren ? String(expanded(n)) : null,
    'aria-busy': loading.has(n.node.id) ? 'true' : null,
  });

  const cellLabelFits = (r: Rect) => {
    // Chart px (aspect-ratio 1); the rect already includes the zoom.
    const side = HIERARCHY_VIEW * o.hostScale;
    return fitCellLabel((r.x1 - r.x0) * side, (r.y1 - r.y0) * side, o.labelFontSize);
  };

  const cell = (n: WindowNode, r: Rect): HierarchyCellView => {
    const branch = o.layout === 'treemap' && expanded(n);
    const fill = branch ? undefined : fillOf(n.node);
    return {
      key: n.node.id,
      bag: scoped({
        ...treeitem(n),
        class: 'cell',
        'data-branch': flag(branch),
        'data-surface': fill ? surfaceOf(n.node, 1) : toneOfSurface(undefined, o.backdrop),
      }),
      style: { ...geometry(r), 'font-size': `${o.labelFontSize}px`, ...(fill ? { background: fill } : {}) },
      label: o.showLabels && cellLabelFits(r) ? labelText(o, n.node) : null,
    };
  };

  const project = (r: Rect): Rect => projectRect(o.view, r.x0, r.y0, r.x1, r.y1);

  const sunburst = (): HierarchyChartView['sunburst'] => {
    const parts = nodes as PartitionNode[];
    // Rings fill the half-size: the hole is 1 unit, ring d spans [d, d+1] units.
    const unit = HIERARCHY_VIEW / 2 / (depth + 1);
    const z = o.view.zoom;
    const hole = project({ x0: 0.5, y0: 0.5, x1: 0.5, y1: 0.5 });
    const holePct = (100 / (depth + 1)) * 0.9;
    const settled = o.tween >= 1;
    return {
      // The geometric view window IS the viewBox: no transform, no re-rasterization.
      svg: scoped({
        viewBox: `${o.view.x * HIERARCHY_VIEW} ${o.view.y * HIERARCHY_VIEW} ${HIERARCHY_VIEW / z} ${HIERARCHY_VIEW / z}`,
        role: 'tree',
        'aria-label': o.label,
      }),
      // role=none: this group only centres the geometry, and an unroled node
      // between role=tree and its treeitems is an aria-required-parent risk.
      g: scoped({ role: 'none', transform: `translate(${HIERARCHY_VIEW / 2},${HIERARCHY_VIEW / 2})` }),
      arcs: parts.map((n) => {
        const span = tweenedSpan(n, o.tween, o.tweenFrom);
        return {
          key: n.node.id,
          bag: scoped({
            ...treeitem(n),
            class: 'ring',
            d: arcPath(0, 0, n.depth * unit, (n.depth + 1) * unit, span.x0 * TAU, span.x1 * TAU, { padAngle: 0.005 }),
            fill: fillOf(n.node) ?? 'var(--mp-hierarchy-chart-node-fill)',
          }),
        };
      }),
      // Labels are fitted IN DEVICE PX: the same 12px label needs a bigger arc
      // on a small host, so labels appear as you re-root or magnify.
      labels: !o.showLabels || !settled
        ? []
        : parts
            .map((n) => ({
              n,
              fit: fitArcLabel(labelText(o, n.node), (n.x1 - n.x0) * TAU, n.depth * unit * effectiveScale, (n.depth + 1) * unit * effectiveScale, o.labelFontSize),
            }))
            .filter(({ fit }) => fit.visible)
            .map(({ n, fit }) => ({
              key: `label-${n.node.id}`,
              text: fit.text,
              bag: scoped({
                class: 'arc-label',
                'aria-hidden': 'true',
                'font-size': Math.round((o.labelFontSize / effectiveScale) * 100) / 100,
                'data-surface': surfaceOf(n.node, n.hasChildren ? 1 : 0.6),
                transform: arcLabelTransform(n.x0, n.x1, (n.depth + 0.5) * unit, fit.orientation),
              }),
            })),
      // A real button OVERLAY in the hole: role=tree only allows treeitem/group children.
      center: {
        bag: scoped({
          type: 'button',
          class: 'center-control',
          'data-zoom-out': '',
          'aria-label': o.zoomOutLabel,
          title: atRoot ? null : o.zoomOutLabel,
          disabled: atRoot || !o.live,
        }),
        style: { left: percent(hole.x0), top: percent(hole.y0), width: `${holePct * z}%`, height: `${holePct * z}%` },
        text: focus ? labelText(o, focus) : '',
      },
    };
  };

  const icicle = (): HierarchyChartView['icicle'] => {
    if (!index || !focus) return null;
    const columns = depth + 1; // column 0 is the focus cell
    const focusRect = project({ x0: 0, y0: 0, x1: 1 / columns, y1: 1 });
    return {
      tree: scoped({ class: 'icicle', role: 'tree', 'aria-label': o.label }),
      focus: {
        key: focus.id,
        bag: scoped({
          class: 'cell focus-cell',
          'data-id': focus.id,
          'data-surface': toneOfSurface(undefined, o.backdrop),
          role: 'treeitem',
          tabindex: o.live ? '-1' : null,
          'aria-label': accessibleName(o, focus),
          'aria-level': levelOf(index, focus),
          'aria-setsize': 1,
          'aria-posinset': 1,
          'aria-expanded': 'true',
          title: atRoot ? null : o.zoomOutLabel,
        }),
        style: { ...geometry(focusRect), 'font-size': `${o.labelFontSize}px` },
        label: o.showLabels && cellLabelFits(focusRect) ? labelText(o, focus) : null,
      },
      cells: (nodes as PartitionNode[]).map((n) => cell(n, project({ x0: n.depth / columns, y0: n.x0, x1: (n.depth + 1) / columns, y1: n.x1 }))),
    };
  };

  const treemap = (): HierarchyChartView['treemap'] => {
    if (!index || !focus) return null;
    const crumbs = pathTo(index, focus).map((n) => labelText(o, n)).join(' / ');
    return {
      wrap: scoped({ class: 'treemap' }),
      header: {
        bag: scoped({ type: 'button', class: 'treemap-header', 'data-zoom-out': '', 'aria-label': o.zoomOutLabel, title: crumbs, disabled: atRoot || !o.live }),
        text: crumbs,
      },
      // Branch tiles are frames; painting order (parents first) keeps children on top.
      body: scoped({ class: 'treemap-body', role: 'tree', 'aria-label': o.label }),
      cells: (nodes as RectNode[]).map((n) => cell(n, project(n))),
    };
  };

  // The focus path as buttons, OUTSIDE any role=tree container (trees own only treeitems).
  const breadcrumb = (): HierarchyChartView['breadcrumb'] => {
    if (!o.showBreadcrumb || !index || !focus) return null;
    const path = pathTo(index, focus);
    return {
      nav: scoped({ class: 'breadcrumb', 'aria-label': o.breadcrumbLabel }),
      items: path.map((node, i) => {
        const last = i === path.length - 1;
        return {
          key: node.id,
          text: labelText(o, node),
          current: last ? scoped({ class: 'crumb-current', 'aria-current': 'location' }) : null,
          button: last ? null : scoped({ type: 'button', class: 'crumb', 'data-crumb': node === index.root ? '' : node.id, disabled: !o.live }),
          sep: last ? null : scoped({ class: 'crumb-sep', 'aria-hidden': 'true' }),
        };
      }),
    };
  };

  const hasTree = !!index && !!focus;
  return {
    root: scoped({ class: 'hierarchy-chart' }),
    breadcrumb: breadcrumb(),
    chart: scoped({ class: o.pinch ? 'chart pinch' : 'chart' }),
    // The cells animate through this; reduced motion kills the transition in the sheet.
    chartStyle: { '--mp-hierarchy-chart-transition-duration': `${o.transitionDuration}ms` },
    sunburst: hasTree && o.layout === 'sunburst' ? sunburst() : null,
    icicle: hasTree && o.layout === 'icicle' ? icicle() : null,
    treemap: hasTree && o.layout === 'treemap' ? treemap() : null,
    cellLabel: scoped({ class: 'cell-label' }),
    tooltip: {
      bag: scoped({ class: 'chart-tooltip', 'aria-hidden': 'true', 'data-visible': flag(o.tooltip !== null) }),
      style: o.tooltip ? { left: `${o.tooltip.left}px`, top: `${o.tooltip.top}px` } : {},
      text: o.tooltip?.text ?? '',
    },
    // A transient "how to zoom" overlay on an uncaptured plain wheel; purely visual.
    hint: o.hint === null ? null : { bag: scoped({ class: 'zoom-hint', 'aria-hidden': 'true' }), text: o.hint },
    // No role: the live region sits beside role=tree containers inside .chart.
    live: scoped({ class: 'visually-hidden', 'aria-live': 'polite', 'aria-atomic': 'true' }),
    announcement: o.announcement,
  };
}
