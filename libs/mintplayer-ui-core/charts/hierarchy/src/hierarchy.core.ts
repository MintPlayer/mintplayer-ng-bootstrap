import { Announcer } from '@mintplayer/ui-core/announce';
import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import {
  FITTED_VIEW,
  panView,
  pathTo,
  pointFraction,
  resolveFocus,
  zoomViewAt,
  type HierarchyHoverEventDetail,
  type HierarchyIndex,
  type HierarchyLoadErrorEventDetail,
  type HierarchyNode,
  type HierarchyNodeEventDetail,
  type PartitionNode,
  type ViewWindow,
} from '@mintplayer/ui-core/charts/core';
import {
  FALLBACK_HOST_SCALE,
  HIERARCHY_VIEW,
  configuredDepth,
  connectHierarchyChart,
  hierarchyIndex,
  labelText,
  normalizeLayout,
  renderedDepth,
  tabStop,
  tooltipText,
  tweenedSpan,
  windowEntries,
  windowNodes,
  type HierarchyChartView,
  type HierarchyChildrenLoader,
  type HierarchyNodeFormatter,
  type HierarchyTooltip,
  type WindowEntry,
} from './hierarchy';

/**
 * The hierarchy chart's core (PRD #437 D10): what the generated Angular, React,
 * Vue and Lit components host. `hierarchy.component.ts` is the manifest and
 * `templates/hierarchy-chart.view.vue` the markup.
 *
 * No-JS: the server renders the finished chart at the 420px fallback scale;
 * its controls are disabled and its treeitems untabbable until it is live.
 */
export interface HierarchyChartInputs {
  /** The whole tree. */
  data: HierarchyNode | null;
  layout: string;
  /** The focus node (the tree root when null); two-way. */
  rootId: string | null;
  /** Levels rendered outward from the focus: a positive number, or `'auto'` for every loaded level. */
  maxDepth: number | string | null;
  /** Degrees; thinner sunburst arcs are culled. */
  minAngle: number;
  /** Logical px of the 1000-unit square; smaller icicle and treemap cells are culled. */
  minSize: number;
  showLabels: boolean;
  /** Device px, constant across host size and zoom. */
  labelFontSize: number;
  /** The opaque colour behind the chart; unset, it is read from the nearest opaque ancestor. */
  backdrop: string | null;
  colorMin: number;
  colorMax: number;
  colorStart: string;
  colorEnd: string;
  /** Ms; the re-root tween and the cell transitions. */
  transitionDuration: number;
  locale: string | null;
  /** Space-separated: `'wheel pinch'` (default), `'wheel'`, `'pinch'` or `'none'`. */
  zoomGestures: string;
  zoomHintLabel: string | null;
  showBreadcrumb: boolean;
  breadcrumbLabel: string;
  zoomOutLabel: string;
  metricUnitLabel: string;
  valueUnitLabel: string;
  loadingLabel: string;
  /** The tree's accessible name; an `aria-label` on the component wins. */
  inputLabel: string | null;
  tooltipFormatter: HierarchyNodeFormatter | null;
  labelFormatter: HierarchyNodeFormatter | null;
  loadChildren: HierarchyChildrenLoader | null;
}

export interface HierarchyChartState {
  rootId: string | null;
  view: ViewWindow;
  hostScale: number;
  backdrop: string;
  /** Re-root tween progress, 0..1 (1 = settled), and the spans it starts from. */
  tween: number;
  tweenFrom: Readonly<Record<string, { x0: number; x1: number }>> | null;
  focusedId: string | null;
  tooltip: HierarchyTooltip | null;
  hint: boolean;
  loading: readonly string[];
  failed: readonly string[];
  /** Nodes whose loader resolved: an EMPTY result looks exactly like "not loaded yet". */
  loaded: readonly string[];
  /** Bumped when a lazy load grew the tree in place. */
  version: number;
  announcement: string;
  /** The nearest `lang`, read once the chart is live. */
  lang: string | null;
}

export interface HierarchyChartEvents {
  rootIdChange: string | null;
  zoom: HierarchyNodeEventDetail;
  nodeSelect: HierarchyNodeEventDetail;
  nodeHover: HierarchyHoverEventDetail;
  nodeLoadError: HierarchyLoadErrorEventDetail;
}

export interface HierarchyChartMethods {
  /** Re-root on a node (the tree root when omitted). */
  zoomTo(id?: string | null): void;
  /** Move the roving tab stop, and focus, to a rendered node. */
  focusNode(id: string): void;
  /** Geometric magnification anchored at chart fractions (default: the centre). */
  setZoomLevel(zoom: number, anchorX?: number, anchorY?: number): void;
  resetZoom(): void;
  /** The current geometric magnification (1 = fitted). */
  zoomLevel(): number;
}

type Api = CoreApi<HierarchyChartInputs, HierarchyChartState, HierarchyChartEvents>;

const MAX_ZOOM = 32;
const MOVES = new Set(['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']);

const localeOf = (inputs: Readonly<HierarchyChartInputs>, state: Readonly<HierarchyChartState>) =>
  inputs.locale || state.lang || undefined;

const gesturesOf = (inputs: Readonly<HierarchyChartInputs>): Set<string> =>
  new Set((inputs.zoomGestures ?? 'wheel pinch').toLowerCase().split(/\s+/).filter((p) => p === 'wheel' || p === 'pinch'));

const hintLabelOf = (inputs: Readonly<HierarchyChartInputs>): string => {
  if (inputs.zoomHintLabel) return inputs.zoomHintLabel;
  const apple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '');
  return apple ? 'Use ⌘ + scroll to zoom the chart' : 'Use Ctrl + scroll to zoom the chart';
};

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Computed backgrounds are rgb()/rgba(); 'transparent' computes to rgba(0, 0, 0, 0). */
function isOpaqueColor(color: string): boolean {
  if (!color || color === 'transparent') return false;
  const alpha = color.match(/^rgba\([^)]+,\s*([\d.]+)\s*\)$/i)?.[1];
  if (alpha !== undefined) return Number(alpha) >= 1;
  return /^(rgb\(|#|hsl\()/i.test(color);
}

/** The first opaque computed background above the chart, crossing shadow roots; null when none is opaque. */
function findBackdrop(from: Element): string | null {
  if (typeof getComputedStyle !== 'function') return null;
  const walk = (el: Element | null): string | null => {
    if (!el) return null;
    const bg = getComputedStyle(el).backgroundColor;
    if (isOpaqueColor(bg)) return bg;
    const root = el.getRootNode();
    return walk(el.parentElement ?? (root instanceof ShadowRoot ? root.host : null));
  };
  return walk(from);
}

/** Everything the core derives from inputs and state, as the view and the handlers both need it. */
function model(inputs: Readonly<HierarchyChartInputs>, state: Readonly<HierarchyChartState>) {
  const index = hierarchyIndex(inputs.data, state.version);
  const layout = normalizeLayout(inputs.layout);
  const configured = configuredDepth(inputs.maxDepth, !!inputs.loadChildren);
  const depth = renderedDepth(configured, index, state.rootId);
  const focus = index ? resolveFocus(index, state.rootId ?? undefined) : undefined;
  const nodes = windowNodes({ index, layout, rootId: state.rootId, depth, view: state.view, minAngle: inputs.minAngle, minSize: inputs.minSize });
  const entries = windowEntries(index, nodes, focus?.id ?? '');
  return { index, layout, configured, depth, focus, nodes, entries };
}

/** Per-instance behaviour, built in `attach` and reached from the methods and `inputsChanged`. */
interface Engine {
  zoomTo(id: string | null | undefined): void;
  focusNode(id: string): void;
  setZoomLevel(zoom: number, anchorX: number, anchorY: number): void;
  resetZoom(): void;
  inputsChanged(prev: Readonly<HierarchyChartInputs>): void;
}

const engines = new WeakMap<HTMLElement, Engine>();

export const hierarchyChartCore = defineCore<
  HierarchyChartInputs,
  HierarchyChartState,
  { view: HierarchyChartView },
  HierarchyChartEvents,
  undefined,
  undefined,
  HierarchyChartMethods
>({
  state: (inputs) => ({
    rootId: inputs.rootId || null,
    view: FITTED_VIEW,
    hostScale: FALLBACK_HOST_SCALE,
    backdrop: '#ffffff',
    tween: 1,
    tweenFrom: null,
    focusedId: null,
    tooltip: null,
    hint: false,
    loading: [],
    failed: [],
    loaded: [],
    version: 0,
    announcement: '',
    lang: null,
  }),
  view: ({ inputs, state, hydrated, label }) => ({
    view: connectHierarchyChart({
      index: hierarchyIndex(inputs.data, state.version),
      layout: normalizeLayout(inputs.layout),
      rootId: state.rootId,
      maxDepth: configuredDepth(inputs.maxDepth, !!inputs.loadChildren),
      view: state.view,
      minAngle: inputs.minAngle,
      minSize: inputs.minSize,
      showLabels: inputs.showLabels !== false,
      labelFontSize: inputs.labelFontSize,
      backdrop: inputs.backdrop || state.backdrop,
      colorMin: inputs.colorMin,
      colorMax: inputs.colorMax,
      colorStart: inputs.colorStart,
      colorEnd: inputs.colorEnd,
      hostScale: state.hostScale,
      tween: state.tween,
      tweenFrom: state.tweenFrom,
      transitionDuration: inputs.transitionDuration,
      focusedId: state.focusedId,
      loading: state.loading,
      failed: state.failed,
      pinch: gesturesOf(inputs).has('pinch'),
      hint: state.hint && gesturesOf(inputs).has('wheel') ? hintLabelOf(inputs) : null,
      tooltip: state.tooltip,
      announcement: state.announcement,
      showBreadcrumb: !!inputs.showBreadcrumb,
      breadcrumbLabel: inputs.breadcrumbLabel,
      zoomOutLabel: inputs.zoomOutLabel,
      metricUnitLabel: inputs.metricUnitLabel,
      valueUnitLabel: inputs.valueUnitLabel,
      locale: localeOf(inputs, state),
      labelFormatter: inputs.labelFormatter,
      tooltipFormatter: inputs.tooltipFormatter,
      label: label ?? inputs.inputLabel ?? null,
      live: hydrated,
    }),
  }),
  attach: (api) => {
    const root = api.host;
    const inputs = () => api.inputs();
    const state = () => api.state();
    const now = () => model(inputs(), state());
    const textOptions = () => ({
      index: now().index,
      locale: localeOf(inputs(), state()),
      labelFormatter: inputs().labelFormatter,
      tooltipFormatter: inputs().tooltipFormatter,
      metricUnitLabel: inputs().metricUnitLabel,
      valueUnitLabel: inputs().valueUnitLabel,
    });
    const chartEl = () => root.querySelector<HTMLElement>('.chart');
    const itemEl = (id: string) =>
      [...root.querySelectorAll<HTMLElement>('[role="treeitem"][data-id]')].find((el) => el.getAttribute('data-id') === id);

    // omitRole: the region sits beside role=tree containers.
    const announcer = new Announcer({ omitRole: true });
    const unsubscribe = announcer.subscribe((s) => api.setState({ announcement: s.text }));

    let disposed = false;
    let tweenFrame = 0;
    let hintTimer: ReturnType<typeof setTimeout> | undefined;
    let typeahead = '';
    let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
    /** Escape hides the tooltip for this node until the pointer or focus moves elsewhere (WCAG 1.4.13). */
    let dismissedFor: string | null = null;
    let hoveredId: string | null = null;
    const pinchPointers = new Map<number, { x: number; y: number }>();
    let dragPointer: number | null = null;
    let dragLast = { x: 0, y: 0 };
    let dragTotal = 0;
    let dragMoved = false;

    /** Focus a treeitem once the front has rendered it (a re-root replaces the window). */
    const focusLater = (id: string, frames = 6): void => {
      const el = itemEl(id);
      if (el) {
        el.focus({ preventScroll: true });
        return;
      }
      if (!disposed && frames > 0 && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => focusLater(id, frames - 1));
      }
    };

    const resolveBackdrop = () => {
      if (inputs().backdrop || state().tween < 1) return;
      const found = findBackdrop(root);
      if (found && found !== state().backdrop) api.setState({ backdrop: found });
    };

    /* ----- lazy children ----- */

    const isLazy = (node: HierarchyNode | undefined): node is HierarchyNode =>
      !!node && !!node.hasChildren && !node.children?.length && !state().loaded.includes(node.id);

    /** Load every lazy node whose CHILD ring is inside the rendered window. */
    const loadLazy = () => {
      const loader = inputs().loadChildren;
      const m = now();
      if (!loader || !m.index || disposed) return;
      // Under 'auto' the deepest level is a candidate too, or the window could
      // never grow past it: 'auto' plus a loader walks the whole tree, deliberately.
      const unbounded = m.configured === 'auto';
      const busy = new Set([...state().loading, ...state().failed]);
      const index = m.index;
      const candidates = [
        ...(isLazy(m.focus) ? [m.focus] : []),
        ...m.entries.filter((e) => unbounded || e.depth < m.depth).map((e) => index.byId.get(e.id)).filter(isLazy),
      ].filter((node) => !busy.has(node.id));
      if (!candidates.length) return;
      api.setState({ loading: [...state().loading, ...candidates.map((n) => n.id)] });
      candidates
        .filter((node) => node === m.focus)
        .map((node) => announcer.announce(`${inputs().loadingLabel} ${labelText(inputs(), node)}`));
      candidates.map((node) =>
        loader(node).then(
          (children) => {
            if (disposed) return;
            node.children = children;
            api.setState({
              loading: state().loading.filter((id) => id !== node.id),
              loaded: [...state().loaded, node.id],
              version: state().version + 1,
            });
            loadLazy();
          },
          (error) => {
            if (disposed) return;
            api.setState({ loading: state().loading.filter((id) => id !== node.id), failed: [...state().failed, node.id] });
            api.emit('nodeLoadError', { node, error });
          },
        ),
      );
    };

    /* ----- geometric view ----- */

    const setView = (view: ViewWindow) => {
      if (view !== state().view) api.setState({ view });
    };
    const setZoomLevel = (zoom: number, ax = 0.5, ay = 0.5) => {
      setView(zoomViewAt(state().view, zoom, ax, ay, MAX_ZOOM));
      loadLazy();
    };
    const resetZoom = () => setView(FITTED_VIEW);
    const chartAnchor = (p: { clientX: number; clientY: number }) => pointFraction(chartEl()?.getBoundingClientRect(), p.clientX, p.clientY);
    const panBy = (dx: number, dy: number) => setView(panView(state().view, dx, dy));

    /* ----- re-root ----- */

    /** Spans as drawn right now, so a retarget mid-tween restarts from the visible state. */
    const drawnSpans = (): Record<string, { x0: number; x1: number }> =>
      Object.fromEntries(
        (now().layout === 'sunburst' ? (now().nodes as PartitionNode[]) : []).map((n) => [n.node.id, tweenedSpan(n, state().tween, state().tweenFrom)]),
      );

    const beginTween = () => {
      const duration = inputs().transitionDuration;
      if (duration <= 0 || reducedMotion() || now().layout !== 'sunburst' || !now().nodes.length) return;
      cancelAnimationFrame(tweenFrame);
      api.setState({ tweenFrom: drawnSpans(), tween: 0 });
      const start = performance.now();
      const step = (time: number) => {
        if (disposed) return;
        const tween = Math.min(1, (time - start) / duration);
        api.setState(tween >= 1 ? { tween, tweenFrom: null } : { tween });
        if (tween < 1) tweenFrame = requestAnimationFrame(step);
        else resolveBackdrop();
      };
      tweenFrame = requestAnimationFrame(step);
    };

    /** Keep focus inside the chart when the focused node leaves the window. */
    const settleFocus = (hadFocus: boolean) => {
      const next = tabStop(now().entries, state().focusedId);
      if (next !== state().focusedId) api.setState({ focusedId: next });
      if (hadFocus && next !== null) focusLater(next);
    };

    const zoomTo = (id: string | null | undefined) => {
      const index = now().index;
      if (!index) return;
      const target = resolveFocus(index, id ?? undefined);
      if (target === now().focus) return;
      const hadFocus = root.contains(document.activeElement);
      // Re-rooting refits the subtree; a stale magnification would disorient.
      resetZoom();
      beginTween();
      api.setState({ rootId: target === index.root ? null : target.id });
      announcer.announce(labelText(inputs(), target));
      api.emit('zoom', { node: target, path: pathTo(index, target) });
      settleFocus(hadFocus);
      loadLazy();
    };

    const zoomOut = () => {
      const { index, focus } = now();
      if (!index || !focus || focus === index.root) return;
      zoomTo(index.parents.get(focus.id)?.id ?? null);
    };

    const activate = (node: HierarchyNode, index: HierarchyIndex) => {
      // Activating a node retries a failed OR empty load.
      api.setState({ failed: state().failed.filter((id) => id !== node.id), loaded: state().loaded.filter((id) => id !== node.id) });
      if (node === now().focus) zoomOut();
      else if (node.children?.length || (node.hasChildren && inputs().loadChildren)) zoomTo(node.id);
      else api.emit('nodeSelect', { node, path: pathTo(index, node) });
    };

    const focusNode = (id: string) => {
      if (!now().entries.some((e) => e.id === id)) return;
      api.setState({ focusedId: id });
      focusLater(id);
    };

    /* ----- tooltip ----- */

    /** Show the tooltip at chart coordinates, kept inside the chart once its size is known. */
    const showTooltip = (node: HierarchyNode, x: number, y: number) => {
      const text = tooltipText(textOptions(), node);
      api.setState({ tooltip: { text, left: x + 12, top: y + 12 } });
      // Measured after it is visible; the +12px keeps it off the pointer-to-node line.
      const clamp = (frames: number) => {
        const tip = root.querySelector<HTMLElement>('.chart-tooltip');
        const chart = chartEl();
        const current = state().tooltip;
        if (!tip || !chart || !current || current.text !== text) return;
        if (tip.textContent !== text && frames > 0 && typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => clamp(frames - 1));
          return;
        }
        const left = Math.max(0, Math.min(x + 12, chart.clientWidth - tip.offsetWidth));
        const top = Math.max(0, Math.min(y + 12, chart.clientHeight - tip.offsetHeight));
        if (left !== current.left || top !== current.top) api.setState({ tooltip: { text, left, top } });
      };
      clamp(6);
    };
    const hideTooltip = () => {
      if (state().tooltip) api.setState({ tooltip: null });
    };

    const clearHover = () => {
      hideTooltip();
      dismissedFor = null;
      if (hoveredId !== null) {
        hoveredId = null;
        api.emit('nodeHover', { node: null, path: [] });
      }
    };

    /* ----- events ----- */

    const nodeFrom = (ev: Event): HierarchyNode | undefined => {
      const id = (ev.target as Element | null)?.closest?.('[data-id]')?.getAttribute('data-id');
      return id ? now().index?.byId.get(id) : undefined;
    };

    const onClick = (ev: MouseEvent) => {
      // A drag-pan release is not an activation.
      if (dragMoved) {
        dragMoved = false;
        return;
      }
      const target = ev.target as Element | null;
      const index = now().index;
      if (!index) return;
      const crumb = target?.closest?.('[data-crumb]');
      if (crumb) {
        zoomTo(crumb.getAttribute('data-crumb') || null);
        return;
      }
      if (target?.closest?.('[data-zoom-out]')) {
        zoomOut();
        return;
      }
      const node = nodeFrom(ev);
      if (node) activate(node, index);
    };

    const onWheel = (ev: WheelEvent) => {
      if (!gesturesOf(inputs()).has('wheel') || !now().index) return;
      if (!ev.ctrlKey && !ev.metaKey) {
        // Never captured: page scroll survives.
        clearTimeout(hintTimer);
        api.setState({ hint: true });
        hintTimer = setTimeout(() => api.setState({ hint: false }), 1500);
        return;
      }
      ev.preventDefault(); // claimed: chart zoom instead of page zoom, over the chart only
      // deltaMode normalization + clamp: engines report ±1 line to ±100 px per notch.
      const unit = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? (root.clientHeight || 400) : 1;
      const delta = Math.max(-100, Math.min(100, ev.deltaY * unit));
      const anchor = chartAnchor(ev);
      setZoomLevel(state().view.zoom * Math.exp(-delta * 0.005), anchor.x, anchor.y);
    };

    const pinchDistance = () => {
      const [p1, p2] = [...pinchPointers.values()];
      return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    };
    const pinchMidpoint = () => {
      const [p1, p2] = [...pinchPointers.values()];
      return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.pointerType === 'touch') {
        // No preventDefault on a touch pointerdown: it suppresses the click that drives tap-to-re-root.
        if (gesturesOf(inputs()).has('pinch')) pinchPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        return;
      }
      // Mouse/pen: primary-button drag pans the zoomed view; at 1x plain clicking is untouched.
      if (state().view.zoom > 1 && ev.button === 0) {
        dragPointer = ev.pointerId;
        dragLast = { x: ev.clientX, y: ev.clientY };
        dragTotal = 0;
        dragMoved = false;
      }
    };

    /** @returns true when the move belonged to a pinch or a drag (no hover then). */
    const trackViewGesture = (ev: PointerEvent): boolean => {
      if (ev.pointerType === 'touch' && pinchPointers.has(ev.pointerId)) {
        if (pinchPointers.size !== 2) {
          pinchPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
          return false;
        }
        const beforeDistance = pinchDistance();
        const beforeMid = pinchMidpoint();
        pinchPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (beforeDistance > 0) {
          const mid = pinchMidpoint();
          const anchor = chartAnchor({ clientX: mid.x, clientY: mid.y });
          // Continuous: spread magnifies, squeeze shrinks, midpoint movement pans.
          setZoomLevel(state().view.zoom * (pinchDistance() / beforeDistance), anchor.x, anchor.y);
          const rect = chartEl()?.getBoundingClientRect();
          if (rect?.width && rect.height) panBy((mid.x - beforeMid.x) / rect.width, (mid.y - beforeMid.y) / rect.height);
        }
        return true;
      }
      if (dragPointer === ev.pointerId) {
        const dx = ev.clientX - dragLast.x;
        const dy = ev.clientY - dragLast.y;
        dragLast = { x: ev.clientX, y: ev.clientY };
        dragTotal += Math.abs(dx) + Math.abs(dy);
        if (dragTotal > 3) dragMoved = true; // a jiggly click still activates
        const rect = chartEl()?.getBoundingClientRect();
        if (rect?.width && rect.height) panBy(dx / rect.width, dy / rect.height);
        return true;
      }
      return false;
    };

    /** pointerup ends the gesture; pointercancel abandons it. */
    const endViewGesture = (ev: PointerEvent) => {
      pinchPointers.delete(ev.pointerId);
      if (dragPointer === ev.pointerId) dragPointer = null;
    };

    const onPointerMove = (ev: PointerEvent) => {
      const index = now().index;
      if (!index) return;
      if (trackViewGesture(ev)) return;
      const node = nodeFrom(ev);
      if (!node || node === now().focus || !chartEl()?.contains(ev.target as Node)) {
        clearHover();
        return;
      }
      if (node.id !== dismissedFor) {
        dismissedFor = null;
        const rect = chartEl()?.getBoundingClientRect();
        if (rect) showTooltip(node, ev.clientX - rect.left, ev.clientY - rect.top);
      }
      if (hoveredId !== node.id) {
        hoveredId = node.id;
        api.emit('nodeHover', { node, path: pathTo(index, node) });
      }
    };

    /** Keyboard parity for the hover tooltip (1.4.13): show on focus, hide on blur. */
    const onFocusIn = (ev: FocusEvent) => {
      const target = (ev.target as Element | null)?.closest?.('[role="treeitem"][data-id]');
      const id = target?.getAttribute('data-id');
      const node = id ? now().index?.byId.get(id) : undefined;
      if (node && id !== state().focusedId && now().entries.some((e) => e.id === id)) api.setState({ focusedId: id });
      if (!node || node === now().focus || node.id === dismissedFor) return;
      dismissedFor = null;
      const chartRect = chartEl()?.getBoundingClientRect();
      const rect = target?.getBoundingClientRect();
      if (!chartRect || !rect) return;
      showTooltip(node, rect.left - chartRect.left + rect.width / 2, rect.top - chartRect.top + rect.height / 2);
    };
    const onFocusOut = () => hideTooltip();

    /** Zoom anchored on a node's on-screen centre (falls back to the chart centre). */
    const zoomKeyboard = (id: string, zoom: number) => {
      const chart = chartEl()?.getBoundingClientRect();
      const rect = itemEl(id)?.getBoundingClientRect();
      const anchor = chart?.width && rect?.width
        ? chartAnchor({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 })
        : { x: 0.5, y: 0.5 };
      setZoomLevel(zoom, anchor.x, anchor.y);
    };

    const moveTo = (id: string | null | undefined) => {
      if (id === null || id === undefined) return;
      itemEl(id)?.focus({ preventScroll: true });
      api.setState({ focusedId: id });
    };

    /** APG tree, adapted to a radial window: siblings wrap, Down goes outward. */
    const moveTarget = (entries: readonly WindowEntry[], id: string, key: string): string | null | undefined => {
      const entry = entries.find((e) => e.id === id);
      const siblings = entries.filter((e) => e.parentId === entry?.parentId);
      const at = siblings.findIndex((e) => e.id === id);
      switch (key) {
        case 'ArrowRight':
          return siblings[(at + 1) % siblings.length]?.id;
        case 'ArrowLeft':
          return siblings[(at - 1 + siblings.length) % siblings.length]?.id;
        case 'ArrowDown':
          return entries.find((e) => e.parentId === id)?.id;
        case 'ArrowUp':
          return entries.some((e) => e.id === entry?.parentId) ? entry?.parentId : undefined;
        case 'Home':
          return siblings[0]?.id;
        default:
          return siblings[siblings.length - 1]?.id;
      }
    };

    const onTypeahead = (ev: KeyboardEvent, currentId: string) => {
      if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      clearTimeout(typeaheadTimer);
      typeahead += ev.key.toLowerCase();
      typeaheadTimer = setTimeout(() => (typeahead = ''), 500);
      const { index, entries } = now();
      if (!index) return;
      const from = entries.findIndex((e) => e.id === currentId);
      const rotated = [...entries.slice(from + 1), ...entries.slice(0, from + 1)];
      const hit = rotated.find((e) => {
        const node = index.byId.get(e.id);
        return node ? labelText(inputs(), node).toLowerCase().startsWith(typeahead) : false;
      });
      if (hit) {
        moveTo(hit.id);
        ev.preventDefault();
      }
    };

    const onKeydown = (ev: KeyboardEvent) => {
      const id = (ev.target as Element | null)?.closest?.('[role="treeitem"][data-id]')?.getAttribute('data-id');
      const { index, focus, entries } = now();
      if (!index || !id) return;
      if (MOVES.has(ev.key)) {
        moveTo(moveTarget(entries, id, ev.key));
      } else {
        switch (ev.key) {
          case 'Enter': {
            const node = index.byId.get(id);
            if (!node) return;
            activate(node, index);
            break;
          }
          case 'Escape':
            // Ordering: tooltip (1.4.13 dismissable), then the geometric view,
            // then the semantic zoom-out; at the root with a fitted view, bubble.
            if (state().tooltip) {
              hideTooltip();
              dismissedFor = id;
              break;
            }
            if (state().view.zoom > 1) {
              resetZoom();
              break;
            }
            if (focus === index.root) return;
            zoomOut();
            break;
          case 'Backspace':
            if (focus === index.root) return;
            zoomOut();
            break;
          // The keyboard equivalent of wheel/pinch magnification (2.1.1), anchored on the focused node.
          case '+':
          case '=':
            zoomKeyboard(id, state().view.zoom * 1.5);
            break;
          case '-':
          case '_':
            zoomKeyboard(id, state().view.zoom / 1.5);
            break;
          case '0':
            resetZoom();
            break;
          default:
            onTypeahead(ev, id);
            return;
        }
      }
      ev.preventDefault();
      ev.stopPropagation();
    };

    /* ----- wiring ----- */

    const lang = root.closest('[lang]')?.getAttribute('lang') ?? null;
    if (lang !== state().lang) api.setState({ lang });

    // Device px per viewBox unit: label fit is measured against the real size.
    const resize = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver((entries) => {
          const width = entries[entries.length - 1]?.contentRect.width;
          if (!width) return;
          const scale = width / HIERARCHY_VIEW;
          if (Math.abs(scale - state().hostScale) > 0.001) api.setState({ hostScale: scale });
          resolveBackdrop();
        });
    resize?.observe(root);

    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeydown);
    // Non-passive by intent: a consumed ctrl/cmd+wheel must not also page-zoom.
    root.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', endViewGesture);
    root.addEventListener('pointercancel', endViewGesture);
    root.addEventListener('pointerleave', clearHover);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);

    engines.set(root, {
      zoomTo,
      focusNode,
      setZoomLevel,
      resetZoom,
      inputsChanged: (prev) => {
        const next = inputs();
        // Projections don't share a view window, and new data starts fitted.
        if (next.data !== prev.data || normalizeLayout(next.layout) !== normalizeLayout(prev.layout)) resetZoom();
        const rootId = next.rootId || null;
        if (rootId !== (prev.rootId || null) && rootId !== state().rootId) {
          beginTween();
          api.setState({ rootId });
        }
        if (next.backdrop !== prev.backdrop) resolveBackdrop();
        settleFocus(root.contains(document.activeElement));
        loadLazy();
      },
    });

    resolveBackdrop();
    settleFocus(false);
    loadLazy();

    return () => {
      disposed = true;
      cancelAnimationFrame(tweenFrame);
      clearTimeout(hintTimer);
      clearTimeout(typeaheadTimer);
      resize?.disconnect();
      unsubscribe();
      announcer.destroy();
      engines.delete(root);
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', endViewGesture);
      root.removeEventListener('pointercancel', endViewGesture);
      root.removeEventListener('pointerleave', clearHover);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
    };
  },
  inputsChanged: (api, prev) => engines.get(api.host)?.inputsChanged(prev),
  methods: {
    zoomTo: (api, id) => engines.get(api.host)?.zoomTo(id),
    focusNode: (api, id) => engines.get(api.host)?.focusNode(id),
    setZoomLevel: (api, zoom, anchorX = 0.5, anchorY = 0.5) => engines.get(api.host)?.setZoomLevel(zoom, anchorX, anchorY),
    resetZoom: (api) => engines.get(api.host)?.resetZoom(),
    zoomLevel: (api) => api.state().view.zoom,
  },
});
