import { Announcer } from '@mintplayer/ui-core/announce';
import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { rovingTarget } from '@mintplayer/ui-core/roving';
import { splitterControl, type SplitterResizeEventDetail, type SplitterResizeKey } from '@mintplayer/ui-core/splitter';
import type { DockLayout, DockLayoutNode, DockLayoutSnapshot, DockStackNode } from './dock-layout';
import {
  clampBoundsToHost,
  cloneLayoutNode,
  clonePath,
  collectCornerSnapTargets,
  collectPaneNames,
  countPanesInTree,
  dockNodeBeside,
  findFirstPaneName,
  floatingZIndex,
  forEachStack,
  formatPath,
  getNodeAtPath,
  headerInsertIndex,
  isOrIsAncestorOf,
  isPointWithinBounds,
  parseIntersectionPairs,
  parsePath,
  pathsEqual,
  planIntersectionResize,
  removePaneFromStack,
  resizeFloatingBounds,
  resizeTrackPair,
  resolveSplitNode,
  snapToNearestTarget,
  type DockPath,
  type DropZone,
  type FloatingResizeEdges,
} from './core';
import {
  DOCK_LABELS,
  DOCK_VISUAL_IDLE,
  cloneDockSnapshot,
  connectDock,
  dockLabel,
  dockPaneNames,
  dockTitle,
  floatingResizeEdges,
  floatingTitle,
  isDropZone,
  normalizeDockSnapshot,
  toDockSnapshot,
  type DockIntersection,
  type DockLabels,
  type DockPaneView,
  type DockView,
  type DockVisualState,
} from './dock';

/**
 * The dock manager's core (PRD #437 D10). The template renders the layout the
 * state holds; this file owns everything that measures or moves: pane drags
 * (pointer, touch long-press, keyboard move mode), floating windows (drag,
 * eight-way resize, close), split weights (pushed into each composed splitter,
 * read back from its `resizeEnd`), the intersection handles where dividers
 * cross, and where each pane's content lives.
 *
 * Pane content is teleported (`<teleport :to>`) into one host element per pane
 * that the core creates. The core re-seats each host into the panel of the
 * stack showing it, and parks the rest, so a pane's content keeps its state
 * however often the layout moves it.
 */

export type DockLayoutInput = DockLayoutSnapshot | DockLayout | DockLayoutNode | null;

export interface DockInputs {
  /** Two-way: any layout shape; the dock writes back a normalized snapshot. */
  layout: DockLayoutInput;
  /** Throws when a pane in the layout has no tab: a layout the dock cannot display. */
  debugLayoutIntegrity: boolean;
  labels: Partial<DockLabels> | null;
}

export interface DockState {
  layout: DockLayoutSnapshot;
  visual: DockVisualState;
  paneHosts: readonly DockPaneView[];
  announcement: string;
}

export interface DockPaneActivatedEventDetail {
  readonly pane: string;
}

export interface DockEvents {
  layoutChange: DockLayoutSnapshot;
  paneActivated: DockPaneActivatedEventDetail;
}

export interface DockMethods {
  captureLayout(): DockLayoutSnapshot;
}

type Api = CoreApi<DockInputs, DockState, DockEvents>;

interface Engine {
  splitResizeEnd(path: string, detail: SplitterResizeEventDetail): void;
  splitResizing(): void;
  adopt(input: DockLayoutInput): void;
}

const engines = new WeakMap<HTMLElement, Engine>();
const engineOf = (api: Api | null): Engine | undefined => (api ? engines.get(api.host) : undefined);

export const mergeDockLabels = (labels: Partial<DockLabels> | null | undefined): DockLabels => ({ ...DOCK_LABELS, ...(labels ?? {}) });

/* Touch tab-drag: a held finger arms the drag; a horizontal swipe scrolls the strip. */
const TOUCH_LONG_PRESS_MS = 600;
const TOUCH_LONG_PRESS_SLOP_PX = 10;
const TOUCH_PRESS_FEEDBACK_DELAY_MS = 150;
const MOUSE_DRAG_THRESHOLD_PX = 5;
/** Pointer travel out of the header before an in-header tab drag tears off. */
const TEAR_OFF_THRESHOLD_PX = 8;
const MIN_PANEL_PX = 48;
const CORNER_SNAP_PX = 10;
const INTERSECTION_TOLERANCE_PX = 24;
const FLOATING_BORDER = 1;
/** Clockwise from the top, so cycling reads as a rotation around the stack. */
const PANE_MOVE_ZONE_ORDER: readonly DropZone[] = ['top', 'right', 'bottom', 'left'];

type ResolvedLocation =
  | { context: 'docked'; path: number[]; node: DockStackNode }
  | { context: 'floating'; index: number; path: number[]; node: DockStackNode };

/** One keyboard drop target; `pathStr` is the stack's `data-path`, the pointer path's identity too. */
interface PaneMoveCandidate {
  pathStr: string | null;
  zone: DropZone | 'float';
  targetTitles: string;
}

interface TabDragMetrics {
  pointerOffsetX: number;
  pointerOffsetY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  startClientX: number;
  startClientY: number;
}

interface PaneDrag {
  pane: string;
  sourcePath: DockPath;
  /** -1 while the tab is still being dragged inside its own header; null for a keyboard move. */
  floatingIndex: number | null;
  pointerOffsetX: number;
  pointerOffsetY: number;
  dropHandled: boolean;
  headerBounds: { left: number; top: number; right: number; bottom: number } | null;
  startClientX: number;
  startClientY: number;
}

interface FloatingDrag {
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  handle: HTMLElement;
  dropTarget: { path: DockPath; zone: DropZone } | null;
}

interface FloatingResize {
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
  start: { left: number; top: number; width: number; height: number };
  handle: HTMLElement;
  edge: string;
  edges: FloatingResizeEdges;
}

interface CornerTrack {
  path: DockPath;
  index: number;
  splitter: HTMLElement;
  initialSizes: number[];
  start: number;
}

interface CornerResize {
  pointerId: number;
  handle: HTMLElement;
  key: string;
  /** Horizontal bars (vertical splits) follow Y; vertical bars follow X. */
  hs: CornerTrack[];
  vs: CornerTrack[];
  snapX: number[];
  snapY: number[];
}

/** What the joystick is showing: the target stack and the zone it has settled on. */
interface Joystick {
  path: string;
  zone: DropZone | null;
}

const isEditable = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** The index of the floating window an element sits in, or -1. */
const floatingIndexOf = (el: HTMLElement): number => {
  const path = parsePath(el.closest<HTMLElement>('.dock-floating')?.dataset['path']);
  return path?.type === 'floating' ? path.index : -1;
};

function attachDock(api: Api): () => void {
  const root = api.host;
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const labels = () => mergeDockLabels(api.inputs().labels);

  const announcer = new Announcer();
  const unsubscribe = announcer.subscribe((s) => api.setState({ announcement: s.text }));
  const announce = (text: string) => announcer.announce(text);

  /* ----- the working layout ----- */

  /** The layout the gestures mutate; `commit` publishes a copy. */
  let work: DockLayoutSnapshot = cloneDockSnapshot(api.state().layout);
  const title = (pane: string) => dockTitle(work, pane);

  const normalize = () => {
    work = normalizeDockSnapshot(work);
  };

  const hosts = new Map<string, HTMLElement>(api.state().paneHosts.map((p) => [p.name, p.host]));
  const syncPaneHosts = () => {
    const missing = dockPaneNames(work).filter((name) => !hosts.has(name));
    if (missing.length === 0) return;
    missing.forEach((name) => {
      const host = doc.createElement('div');
      host.className = 'dock-pane-content';
      host.setAttribute('data-mps', 'dock');
      host.dataset['pane'] = name;
      hosts.set(name, host);
    });
    api.setState({ paneHosts: [...hosts].map(([name, host]) => ({ name, host })) });
  };

  /** Publish the working layout: re-render, write the model back, fire `layoutChange`. */
  const commit = () => {
    syncPaneHosts();
    api.setState({ layout: cloneDockSnapshot(work) });
    api.emit('layoutChange', cloneDockSnapshot(work));
  };

  const visual = (patch: Partial<DockVisualState>) => api.setState({ visual: { ...api.state().visual, ...patch } });

  /* ----- DOM lookups (own elements only, never a nested dock's) ----- */

  const own = (el: Element | null): boolean => !!el && el.closest('.dock') === root;
  const ownAll = <T extends Element = HTMLElement>(selector: string): T[] => Array.from(root.querySelectorAll<T>(selector)).filter(own);
  const closestOwn = (target: EventTarget | null, selector: string): HTMLElement | null => {
    const el = target instanceof Element ? target.closest<HTMLElement>(selector) : null;
    return el && own(el) ? el : null;
  };
  const byPath = (selector: string, path: string): HTMLElement | null => ownAll(selector).find((el) => el.dataset['path'] === path) ?? null;
  const stackEl = (path: DockPath | string | null): HTMLElement | null =>
    path === null ? null : byPath('.dock-stack', typeof path === 'string' ? path : formatPath(path));
  const stripOf = (stack: HTMLElement | null) =>
    stack ? (Array.from(stack.children).find((c) => c.classList.contains('dock-stack__strip')) as HTMLElement | undefined) ?? null : null;
  const dockedEl = () => ownAll('.dock-docked')[0] ?? null;

  /** The splitter root a `.dock-split` composes: its first splitter, never a nested one. */
  const splitterOf = (split: HTMLElement | null): HTMLElement | null =>
    split ? split.querySelector<HTMLElement>('.splitter[data-mps="splitter"]') : null;
  const splitterAt = (path: DockPath | null) => (path ? splitterOf(byPath('.dock-split', formatPath(path))) : null);
  const panelsOf = (splitter: HTMLElement) =>
    Array.from(splitter.children).filter((el): el is HTMLElement => el.classList.contains('splitter-panel'));
  /** Divider k sits in front of panel k + 1. */
  const dividersOf = (splitter: HTMLElement | null): HTMLElement[] =>
    splitter
      ? panelsOf(splitter)
          .slice(1)
          .map((panel) => Array.from(panel.children).find((el) => el.classList.contains('splitter-divider')) as HTMLElement | undefined)
          .filter((el): el is HTMLElement => !!el)
      : [];

  const hostSize = () => ({ width: root.clientWidth, height: root.clientHeight });
  const hostRect = () => root.getBoundingClientRect();

  /* ----- layout locations ----- */

  const resolveStackLocation = (path: DockPath): ResolvedLocation | null => {
    if (path.type === 'floating') {
      const layout = work.floating[path.index];
      if (!layout?.root) return null;
      const node = getNodeAtPath(layout.root, path.segments);
      return node?.kind === 'stack' ? { context: 'floating', index: path.index, path: [...path.segments], node } : null;
    }
    const node = getNodeAtPath(work.root, path.segments);
    return node?.kind === 'stack' ? { context: 'docked', path: [...path.segments], node } : null;
  };

  const removePaneFromFloating = (index: number, path: number[], pane: string): boolean => {
    const floating = work.floating[index];
    if (!floating?.root) return false;
    const node = getNodeAtPath(floating.root, path);
    if (!node || node.kind !== 'stack') return false;
    node.panes = node.panes.filter((p) => p !== pane);
    if (!node.panes.includes(node.activePane ?? '')) {
      if (node.panes.length > 0) node.activePane = node.panes[0];
      else delete node.activePane;
    }
    if (floating.activePane === pane) {
      const fallback = findFirstPaneName(floating.root);
      if (fallback) floating.activePane = fallback;
      else delete floating.activePane;
    }
    return node.panes.length === 0;
  };

  /** Callers normalize once they have finished mutating. */
  const removePaneFromLocation = (location: ResolvedLocation, pane: string): boolean =>
    location.context === 'docked' ? removePaneFromStack(location.node, pane) : removePaneFromFloating(location.index, location.path, pane);

  const addPaneToLocation = (location: ResolvedLocation, pane: string) => {
    const panes = location.node.panes;
    const existing = panes.indexOf(pane);
    if (existing !== -1) panes.splice(existing, 1);
    panes.push(pane);
  };

  const setActivePaneForLocation = (location: ResolvedLocation, pane: string) => {
    location.node.activePane = pane;
    if (location.context === 'floating') {
      const floating = work.floating[location.index];
      if (floating) floating.activePane = pane;
    }
  };

  const reorderPaneInLocation = (location: ResolvedLocation, pane: string, targetIndex?: number) => {
    const panes = location.node.panes;
    const current = panes.indexOf(pane);
    if (current === -1) return;
    const target = targetIndex === undefined ? panes.length - 1 : Math.max(0, Math.min(targetIndex, panes.length - 1));
    if (targetIndex !== undefined && target === current) return;
    panes.splice(current, 1);
    panes.splice(target, 0, pane);
    setActivePaneForLocation(location, pane);
  };

  const removeFloatingAt = (index: number) => {
    if (index >= 0 && index < work.floating.length) work.floating.splice(index, 1);
  };

  /** Raise a floating window above the others; returns its new z-index. */
  const promoteFloating = (index: number): number => {
    const floating = work.floating[index];
    if (!floating) return 0;
    const maxExisting = work.floating.reduce((max, layout, i) => (i === index ? max : Math.max(max, floatingZIndex(layout, i))), 0);
    floating.zIndex = Math.max(maxExisting + 2, 12);
    return floating.zIndex;
  };

  /* ----- interaction state ----- */

  let pendingMetrics: TabDragMetrics | null = null;
  let drag: PaneDrag | null = null;
  let floatingDrag: FloatingDrag | null = null;
  let floatingResize: FloatingResize | null = null;
  let corner: CornerResize | null = null;
  let joystick: Joystick | null = null;
  let lastDragPoint: { x: number; y: number } | null = null;
  let pendingDragEnd: ReturnType<typeof setTimeout> | null = null;
  let paneMove: { paneName: string; sourcePath: DockPath } | null = null;
  let paneMoveIndex: number | null = null;
  const previousSplitSizes = new Map<string, number[]>();
  const cleanups = new Set<() => void>();

  const interacting = () => !!(drag || floatingDrag || floatingResize || corner);

  /* ----- hit-testing ----- */

  /**
   * The dock's single hit-test: its own elements under a client point,
   * topmost first. The floating window under a drag is skipped, so a drop can
   * target the stack beneath it even before its transparency has rendered.
   */
  const elementsAt = (x: number, y: number): HTMLElement[] => {
    const dragged = floatingDrag?.index ?? (drag && drag.floatingIndex !== null && drag.floatingIndex >= 0 ? drag.floatingIndex : null);
    const draggedPath = dragged === null ? null : formatPath({ type: 'floating', index: dragged, segments: [] });
    const found = typeof doc.elementsFromPoint === 'function' ? doc.elementsFromPoint(x, y) : [];
    return found.filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && own(el) && (draggedPath === null || el.closest<HTMLElement>('.dock-floating')?.dataset['path'] !== draggedPath),
    );
  };

  const isJoystickPart = (el: HTMLElement) =>
    el.classList.contains('dock-drop-joystick') || el.classList.contains('dock-drop-joystick__button') || el.classList.contains('dock-drop-joystick__spacer');

  const findStackAtPoint = (x: number, y: number): HTMLElement | null => {
    const elements = elementsAt(x, y);
    for (const el of elements) {
      if (el.classList.contains('dock-stack')) return el;
      if (joystick && isJoystickPart(el)) return stackEl(joystick.path) ?? (joystick.path === 'd:' ? dockedEl() : null);
    }
    // With every pane floating, the empty docked surface is the main drop target.
    const docked = dockedEl();
    return !work.root && docked && elements.includes(docked) ? docked : null;
  };

  const centerOnly = () => !!joystick && !work.root && joystick.path === formatPath({ type: 'docked', segments: [] });

  const findDropZoneByPoint = (x: number, y: number): DropZone | null => {
    if (!joystick) return null;
    for (const el of elementsAt(x, y)) {
      if (!el.classList.contains('dock-drop-joystick__button')) continue;
      const zone = el.dataset['zone'];
      if (isDropZone(zone) && (!centerOnly() || zone === 'center')) return zone;
    }
    return null;
  };

  /* ----- drop indicator + joystick ----- */

  const setJoystickZone = (zone: DropZone | null) => {
    if (!joystick) return;
    // Keep the last zone across hit-test gaps between the buttons.
    joystick.zone = zone ?? joystick.zone;
  };

  const computeDropZone = (stack: HTMLElement, point: { clientX: number; clientY: number } | null, hint?: DropZone | null): DropZone | null => {
    if (isDropZone(hint)) {
      setJoystickZone(hint);
      return hint;
    }
    const pointZone = point && Number.isFinite(point.clientX) && Number.isFinite(point.clientY) ? findDropZoneByPoint(point.clientX, point.clientY) : null;
    if (pointZone) {
      setJoystickZone(pointZone);
      return pointZone;
    }
    // Sticky while hovering the same stack's joystick.
    if (joystick && joystick.path === stack.dataset['path'] && joystick.zone) return joystick.zone;
    return null;
  };

  const hideDropIndicator = () => {
    joystick = null;
    const v = api.state().visual;
    if (v.indicator || v.joystick) visual({ indicator: null, joystick: null });
  };

  const overlayZ = (path: DockPath | null) =>
    path?.type === 'floating' ? floatingZIndex(work.floating[path.index], path.index) + 100 : 100;

  const showDropIndicator = (stack: HTMLElement, zone: DropZone | null) => {
    const targetPath = parsePath(stack.dataset['path']);
    if (targetPath && drag && isOrIsAncestorOf(targetPath, drag.sourcePath)) return;
    const rect = stack.getBoundingClientRect();
    const host = hostRect();
    const pathStr = stack.dataset['path'] ?? '';
    if (joystick && joystick.path !== pathStr) joystick = null;
    joystick = joystick ?? { path: pathStr, zone: null };
    if (zone) joystick.zone = zone;
    const z = overlayZ(targetPath);
    let left = rect.left - host.left;
    let top = rect.top - host.top;
    let width = rect.width;
    let height = rect.height;
    if (zone === 'left' || zone === 'right') {
      width = rect.width / 2;
      if (zone === 'right') left += rect.width / 2;
    } else if (zone === 'top' || zone === 'bottom') {
      height = rect.height / 2;
      if (zone === 'bottom') top += rect.height / 2;
    }
    visual({
      indicator: zone ? { left, top, width, height, z } : null,
      joystick: {
        left: rect.left - host.left + rect.width / 2,
        top: rect.top - host.top + rect.height / 2,
        z: z + 1,
        path: pathStr,
        zone: joystick.zone,
        centerOnly: centerOnly(),
      },
    });
  };

  /* ----- split weights and intersection handles ----- */

  const pushed = new WeakMap<HTMLElement, string>();

  /** Push stored weights into each split's splitter as pixels, once per change. */
  const pushSplitSizes = (attempt = 0) => {
    let retry = false;
    ownAll('.dock-split').forEach((split) => {
      const path = parsePath(split.dataset['path']);
      const node = path ? resolveSplitNode(path, work.root, work.floating) : null;
      const splitter = splitterOf(split);
      if (!node || !splitter || !node.sizes?.length) return;
      const key = JSON.stringify(node.sizes);
      if (pushed.get(splitter) === key) return;
      const control = splitterControl(splitter);
      const rect = splitter.getBoundingClientRect();
      const size = node.direction === 'horizontal' ? rect.width : rect.height;
      if (!control) {
        retry = true;
        return;
      }
      if (!Number.isFinite(size) || size <= 0) return;
      const total = node.sizes.reduce((s, w) => s + Math.max(w, 0), 0);
      if (total <= 0) return;
      control.setPanelSizes(node.sizes.map((w) => (Math.max(w, 0) / total) * size));
      pushed.set(splitter, key);
    });
    // A splitter attaches after its first render; try again next frame.
    if (retry && attempt < 10) frame(() => pushSplitSizes(attempt + 1));
  };

  let intersectionTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * Re-measure the handles after the layout settles: past the splitter's own
   * size-pinning frame, so the dividers read their final positions.
   */
  const scheduleIntersections = () => {
    if (intersectionTimer !== null) return;
    intersectionTimer = setTimeout(() => {
      intersectionTimer = null;
      renderIntersections();
    }, 5);
  };

  const layerKey = (el: HTMLElement) => el.closest<HTMLElement>('.dock-floating')?.dataset['path'] ?? 'd';

  const renderIntersections = () => {
    const rootRect = hostRect();
    if (corner) {
      // Keep the dragged handle (it holds the pointer capture); follow its dividers.
      const h0 = corner.hs[0];
      const v0 = corner.vs[0];
      const hDiv = h0 ? dividersOf(h0.splitter)[h0.index] : null;
      const vDiv = v0 ? dividersOf(v0.splitter)[v0.index] : null;
      const current = api.state().visual.intersections.find((i) => i.key === corner?.key);
      if (hDiv && vDiv && current) {
        const hr = hDiv.getBoundingClientRect();
        const vr = vDiv.getBoundingClientRect();
        const x = vr.left + vr.width / 2 - rootRect.left;
        visual({ intersections: [{ ...current, x, y: hr.top + hr.height / 2 - rootRect.top, valueNow: percentOf(x, rootRect.width) }] });
      }
      return;
    }
    type Divider = { rect: DOMRect; pathStr: string; index: number; layer: string };
    const hs: Divider[] = [];
    const vs: Divider[] = [];
    ownAll('.dock-split').forEach((split) => {
      const pathStr = split.dataset['path'] ?? '';
      const layer = layerKey(split);
      dividersOf(splitterOf(split)).forEach((el, index) => {
        const info = { rect: el.getBoundingClientRect(), pathStr, index, layer };
        // A horizontal split flows left-to-right, so its bars are vertical.
        if (split.dataset['direction'] === 'horizontal') vs.push(info);
        else hs.push(info);
      });
    });
    // Crossings that round to the same pixel share a handle; only one layer's dividers pair up.
    const groups = new Map<string, { x: number; y: number; pairs: { h: { pathStr: string; index: number }; v: { pathStr: string; index: number } }[] }>();
    hs.forEach((h) => {
      const cy = h.rect.top + h.rect.height / 2;
      vs.forEach((v) => {
        if (h.layer !== v.layer) return;
        const cx = v.rect.left + v.rect.width / 2;
        const dx = cx < h.rect.left ? h.rect.left - cx : cx > h.rect.right ? cx - h.rect.right : 0;
        const dy = cy < v.rect.top ? v.rect.top - cy : cy > v.rect.bottom ? cy - v.rect.bottom : 0;
        if (dx > INTERSECTION_TOLERANCE_PX || dy > INTERSECTION_TOLERANCE_PX) return;
        const x = cx - rootRect.left;
        const y = cy - rootRect.top;
        const key = `${Math.round(x)}:${Math.round(y)}`;
        const group = groups.get(key) ?? { x, y, pairs: [] };
        group.pairs.push({ h: { pathStr: h.pathStr, index: h.index }, v: { pathStr: v.pathStr, index: v.index } });
        groups.set(key, group);
      });
    });
    const intersections: DockIntersection[] = [...groups.values()].map((group) => {
      const first = group.pairs[0];
      return {
        key: `${first.h.pathStr}:${first.h.index}|${first.v.pathStr}:${first.v.index}`,
        x: group.x,
        y: group.y,
        pairs: JSON.stringify(group.pairs),
        // A focusable separator needs a value: the vertical divider's position.
        valueNow: percentOf(group.x, rootRect.width),
      };
    });
    if (JSON.stringify(intersections) !== JSON.stringify(api.state().visual.intersections)) visual({ intersections });
  };

  const percentOf = (value: number, total: number) => (total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0);

  const handlePairs = (handle: HTMLElement) => parseIntersectionPairs(handle.dataset['pairs'], handle.dataset['key']);

  const onIntersectionKeyDown = (event: KeyboardEvent, handle: HTMLElement) => {
    const horizontalKey = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const verticalKey = event.key === 'ArrowUp' || event.key === 'ArrowDown';
    const homeEnd = event.key === 'Home' || event.key === 'End';
    if (!horizontalKey && !verticalKey && !homeEnd) return;
    const pairs = handlePairs(handle);
    if (pairs.length === 0) return;
    event.preventDefault();
    // Left/Right and Home/End drive the vertical bar, Up/Down the horizontal one.
    const target = horizontalKey || homeEnd ? pairs[0].v : pairs[0].h;
    splitterControl(splitterAt(parsePath(target.pathStr)))?.resizeDividerBy(target.index, event.key as SplitterResizeKey, event.shiftKey);
  };

  const beginCornerResize = (event: PointerEvent, handle: HTMLElement) => {
    event.preventDefault();
    const pairs = handlePairs(handle);
    const resolve = ({ pathStr, index }: { pathStr: string; index: number }, start: number): CornerTrack | null => {
      const path = parsePath(pathStr);
      const splitter = splitterAt(path);
      const sizes = splitterControl(splitter)?.getPanelSizes() ?? [];
      return path && splitter && sizes.length > 0 ? { path: clonePath(path), index, splitter, initialSizes: sizes, start } : null;
    };
    const hs = pairs.map((p) => resolve(p.h, event.clientY)).filter((e): e is CornerTrack => e !== null);
    const vs = pairs.map((p) => resolve(p.v, event.clientX)).filter((e): e is CornerTrack => e !== null);
    if (hs.length === 0 && vs.length === 0) return;
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      /* capture may be unavailable; the window listeners still drive the resize */
    }
    const rect = (track: CornerTrack | undefined) => (track ? dividersOf(track.splitter)[track.index]?.getBoundingClientRect() ?? null : null);
    const vr = rect(vs[0]);
    const hr = rect(hs[0]);
    const dividers = ownAll('.dock-split').flatMap((split) =>
      dividersOf(splitterOf(split)).map((el) => ({
        direction: split.dataset['direction'] as 'horizontal' | 'vertical' | undefined,
        rect: el.getBoundingClientRect(),
      })),
    );
    const targets = collectCornerSnapTargets({ x: vr ? vr.left + vr.width / 2 : null, y: hr ? hr.top + hr.height / 2 : null }, dividers, hostRect());
    const key = handle.dataset['key'] ?? '';
    corner = { pointerId: event.pointerId, handle, key, hs, vs, snapX: targets.x, snapY: targets.y };
    visual({ resizingIntersection: key });
    startPointerTracking();
  };

  const moveCornerResize = (event: PointerEvent) => {
    const state = corner;
    if (!state || state.pointerId !== event.pointerId) return;
    const rootRect = hostRect();
    const x = snapToNearestTarget(event.clientX, state.snapX.map((sx) => rootRect.left + sx), CORNER_SNAP_PX);
    const y = snapToNearestTarget(event.clientY, state.snapY.map((sy) => rootRect.top + sy), CORNER_SNAP_PX);
    const apply = (track: CornerTrack, delta: number) => {
      const node = resolveSplitNode(track.path, work.root, work.floating);
      if (!node) return;
      const resized = resizeTrackPair(track.initialSizes, track.index, delta, MIN_PANEL_PX, event.shiftKey);
      // An unmeasured track has nothing to redistribute: keep the stored weights.
      if (!resized) return;
      node.sizes = resized.weights;
      splitterControl(track.splitter)?.setPanelSizes(resized.pixels);
      pushed.set(track.splitter, JSON.stringify(node.sizes));
    };
    state.hs.forEach((h) => apply(h, y - h.start));
    state.vs.forEach((v) => apply(v, x - v.start));
    // setPanelSizes is silent, so follow the dividers ourselves.
    scheduleIntersections();
  };

  const endCornerResize = (pointerId: number) => {
    const state = corner;
    if (!state || state.pointerId !== pointerId) return;
    try {
      state.handle.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
    corner = null;
    visual({ resizingIntersection: null });
    commit();
    scheduleIntersections();
  };

  const onIntersectionDoubleClick = (event: MouseEvent, handle: HTMLElement) => {
    event.preventDefault();
    const pairs = handlePairs(handle);
    if (pairs.length === 0) return;
    const splitNodeAt = (pathStr: string) => {
      const path = parsePath(pathStr);
      return path ? resolveSplitNode(path, work.root, work.floating) : null;
    };
    const plan = planIntersectionResize(pairs, previousSplitSizes, (pathStr) => {
      const node = splitNodeAt(pathStr);
      return node ? { sizes: node.sizes, childCount: node.children.length } : null;
    });
    plan.remember.forEach(({ pathStr, sizes }) => previousSplitSizes.set(pathStr, sizes));
    plan.writes.forEach(({ pathStr, sizes }) => {
      const node = splitNodeAt(pathStr);
      if (node) node.sizes = sizes;
    });
    if (plan.clearStored) previousSplitSizes.clear();
    commit();
    scheduleIntersections();
  };

  /* ----- floating windows ----- */

  const liveFloating = (index: number) => {
    const floating = work.floating[index];
    if (floating) visual({ floatingLive: { index, bounds: { ...floating.bounds }, z: floatingZIndex(floating, index) } });
  };

  const beginFloatingDrag = (event: PointerEvent, index: number, handle: HTMLElement) => {
    const floating = work.floating[index];
    if (!floating) return;
    event.preventDefault();
    event.stopPropagation();
    // Start from where the window is drawn, not from a stale unclamped intent.
    floating.bounds = clampBoundsToHost(floating.bounds, hostSize());
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      /* no capture: the window listeners still drive the drag */
    }
    promoteFloating(index);
    floatingDrag = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: floating.bounds.left,
      startTop: floating.bounds.top,
      handle,
      dropTarget: null,
    };
    visual({ draggingFloating: index });
    liveFloating(index);
    startPointerTracking();
  };

  const moveFloatingDrag = (event: PointerEvent) => {
    const state = floatingDrag;
    if (!state || state.pointerId !== event.pointerId) return;
    const floating = work.floating[state.index];
    if (!floating) return;
    floating.bounds = clampBoundsToHost(
      {
        left: state.startLeft + event.clientX - state.startX,
        top: state.startTop + event.clientY - state.startY,
        width: floating.bounds.width,
        height: floating.bounds.height,
      },
      hostSize(),
    );
    liveFloating(state.index);
    // The drop target under the pointer, never the window itself.
    const stack = findStackAtPoint(event.clientX, event.clientY);
    const path = stack ? parsePath(stack.dataset['path']) : null;
    if (!stack || !path || (path.type === 'floating' && path.index === state.index)) {
      if (state.dropTarget) {
        state.dropTarget = null;
        hideDropIndicator();
      }
      return;
    }
    if (joystick && joystick.path !== stack.dataset['path']) joystick = null;
    const zone = computeDropZone(stack, event, findDropZoneByPoint(event.clientX, event.clientY));
    state.dropTarget = zone ? { path, zone } : null;
    showDropIndicator(stack, zone);
  };

  const endFloatingDrag = (pointerId: number, cancelled = false) => {
    const state = floatingDrag;
    if (!state || state.pointerId !== pointerId) return;
    try {
      state.handle.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
    floatingDrag = null;
    hideDropIndicator();
    visual({ draggingFloating: null, floatingLive: null });
    if (!cancelled && state.dropTarget) handleFloatingStackDrop(state.index, state.dropTarget.path, state.dropTarget.zone);
    commit();
  };

  const beginFloatingResize = (event: PointerEvent, index: number, handle: HTMLElement) => {
    const floating = work.floating[index];
    const edge = handle.dataset['edge'] ?? '';
    const edges = floatingResizeEdges(edge);
    if (!floating || !edges) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      /* no capture: the window listeners still drive the resize */
    }
    promoteFloating(index);
    floating.bounds = clampBoundsToHost(floating.bounds, hostSize());
    floatingResize = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      start: { ...floating.bounds },
      handle,
      edge,
      edges,
    };
    visual({ resizingFloating: { index, edge } });
    liveFloating(index);
    startPointerTracking();
  };

  const moveFloatingResize = (event: PointerEvent) => {
    const state = floatingResize;
    if (!state || state.pointerId !== event.pointerId) return;
    const floating = work.floating[state.index];
    if (!floating) return;
    floating.bounds = resizeFloatingBounds(state.start, state.edges, { x: event.clientX - state.startX, y: event.clientY - state.startY }, hostSize());
    liveFloating(state.index);
  };

  const endFloatingResize = (pointerId: number) => {
    const state = floatingResize;
    if (!state || state.pointerId !== pointerId) return;
    try {
      state.handle.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
    floatingResize = null;
    visual({ resizingFloating: null, floatingLive: null });
    commit();
  };

  /** Arrows move the handle 10px (Shift: 1px), through the pointer path's own rule. */
  const onFloatingResizeKeydown = (event: KeyboardEvent, index: number, handle: HTMLElement) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const edges = floatingResizeEdges(handle.dataset['edge']);
    const dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!edges || (dx === 0 && dy === 0)) return;
    if ((dx !== 0 && edges.horizontal === 'none') || (dy !== 0 && edges.vertical === 'none')) return;
    const floating = work.floating[index];
    if (!floating) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 1 : 10;
    floating.bounds = resizeFloatingBounds(floating.bounds, edges, { x: dx * step, y: dy * step }, hostSize());
    commit();
  };

  const closeFloatingPane = (index: number) => {
    const floating = work.floating[index];
    if (!floating) return;
    const name = floatingTitle(work, floating, labels());
    removeFloatingAt(index);
    commit();
    announce(dockLabel(labels().closed, { title: name }));
  };

  /* window listeners for the floating and intersection gestures */
  let tracking = false;
  const onPointerMove = (event: PointerEvent) => {
    moveCornerResize(event);
    moveFloatingResize(event);
    moveFloatingDrag(event);
  };
  const onPointerUp = (event: PointerEvent) => {
    endCornerResize(event.pointerId);
    endFloatingDrag(event.pointerId);
    endFloatingResize(event.pointerId);
    stopPointerTrackingIfIdle();
  };
  /** An OS-level cancel ends every gesture without committing a drop. */
  const onPointerCancel = (event: PointerEvent) => {
    endFloatingDrag(event.pointerId, true);
    endFloatingResize(event.pointerId);
    endCornerResize(event.pointerId);
    stopPointerTrackingIfIdle();
  };
  function startPointerTracking() {
    if (tracking || !win) return;
    win.addEventListener('pointermove', onPointerMove);
    win.addEventListener('pointerup', onPointerUp);
    win.addEventListener('pointercancel', onPointerCancel);
    tracking = true;
  }
  function stopPointerTrackingIfIdle(force = false) {
    if (!tracking || !win || (!force && (floatingDrag || floatingResize || corner))) return;
    win.removeEventListener('pointermove', onPointerMove);
    win.removeEventListener('pointerup', onPointerUp);
    win.removeEventListener('pointercancel', onPointerCancel);
    tracking = false;
  }

  /* ----- pane drag ----- */

  const captureTabDragMetrics = (event: PointerEvent, stack: HTMLElement | null) => {
    if (!stack || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
      pendingMetrics = null;
      return;
    }
    const host = hostRect();
    const rect = stack.getBoundingClientRect();
    pendingMetrics = {
      pointerOffsetX: event.clientX - rect.left,
      pointerOffsetY: event.clientY - rect.top,
      left: rect.left - host.left,
      top: rect.top - host.top,
      width: Number.isFinite(rect.width) ? rect.width : 0,
      height: Number.isFinite(rect.height) ? rect.height : 0,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  };

  /** A mouse or pen arms after 5px of travel; touch after a 600ms hold (see armTouch). */
  const armPaneDrag = (start: PointerEvent, path: DockPath, pane: string, tab: HTMLElement) => {
    if (start.pointerType === 'touch') {
      armTouch(start, path, pane, tab);
      return;
    }
    if (start.pointerType === 'mouse' && start.button !== 0) return;
    if (!win) return;
    const { clientX: startX, clientY: startY, pointerId } = start;
    const cleanup = () => {
      win.removeEventListener('pointermove', onMove, true);
      win.removeEventListener('pointerup', onRelease, true);
      win.removeEventListener('pointercancel', onRelease, true);
      cleanups.delete(cleanup);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId || Math.hypot(event.clientX - startX, event.clientY - startY) < MOUSE_DRAG_THRESHOLD_PX) return;
      cleanup();
      beginPaneDrag(event, path, pane);
    };
    const onRelease = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      cleanup();
      pendingMetrics = null;
    };
    win.addEventListener('pointermove', onMove, true);
    win.addEventListener('pointerup', onRelease, true);
    win.addEventListener('pointercancel', onRelease, true);
    cleanups.add(cleanup);
  };

  /**
   * Touch: `.dock-tab` is `touch-action: none`, so the gesture is ours from the
   * first frame. A hold within the slop arms the drag; a mostly horizontal move
   * past it scrolls the strip from JS (touch-action is frozen at touchstart, so
   * native pan cannot take over later); anything else abandons.
   */
  const armTouch = (start: PointerEvent, path: DockPath, pane: string, tab: HTMLElement) => {
    if (!win) return;
    const { clientX: startX, clientY: startY, pointerId } = start;
    const strip = stripOf(tab.closest<HTMLElement>('.dock-stack'));
    const tabId = tab.dataset['tabId'] ?? null;
    let latestX = startX;
    let latestY = startY;
    let lastScrollX = startX;
    let scrolling = false;
    let resolved = false;
    const clearPressing = () => {
      if (api.state().visual.pressing === tabId) visual({ pressing: null });
    };
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(longPress);
      clearTimeout(feedback);
      win.removeEventListener('pointermove', onMove, true);
      win.removeEventListener('pointerup', onEnd, true);
      win.removeEventListener('pointercancel', onEnd, true);
      cleanups.delete(cleanup);
      clearPressing();
    };
    const onMove = (event: PointerEvent) => {
      if (resolved || event.pointerId !== pointerId) return;
      if (scrolling) {
        if (strip) strip.scrollLeft -= event.clientX - lastScrollX;
        lastScrollX = event.clientX;
        return;
      }
      latestX = event.clientX;
      latestY = event.clientY;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) <= TOUCH_LONG_PRESS_SLOP_PX) return;
      pendingMetrics = null;
      if (Math.abs(dx) > Math.abs(dy) && strip && strip.scrollWidth > strip.clientWidth) {
        clearTimeout(longPress);
        clearTimeout(feedback);
        clearPressing();
        scrolling = true;
        lastScrollX = event.clientX;
        strip.scrollLeft -= dx;
        return;
      }
      cleanup();
    };
    const onEnd = (event: PointerEvent) => {
      if (resolved || event.pointerId !== pointerId) return;
      cleanup();
      pendingMetrics = null;
    };
    const longPress = setTimeout(() => {
      if (resolved) return;
      cleanup();
      try {
        root.setPointerCapture(pointerId);
      } catch {
        /* the pointer is gone; the drag ends on its next event */
      }
      try {
        navigator.vibrate?.(10);
      } catch {
        /* no haptics */
      }
      beginPaneDrag(new PointerEvent('pointermove', { pointerId, pointerType: 'touch', isPrimary: true, clientX: latestX, clientY: latestY }), path, pane);
    }, TOUCH_LONG_PRESS_MS);
    const feedback = setTimeout(() => {
      if (!resolved && tabId) visual({ pressing: tabId });
    }, TOUCH_PRESS_FEEDBACK_DELAY_MS);
    win.addEventListener('pointermove', onMove, true);
    win.addEventListener('pointerup', onEnd, true);
    win.addEventListener('pointercancel', onEnd, true);
    cleanups.add(cleanup);
  };

  const beginPaneDrag = (event: PointerEvent, path: DockPath, pane: string) => {
    const source = preparePaneDragSource(path, pane, event);
    const strip = stripOf(stackEl(path));
    const header = strip?.getBoundingClientRect() ?? null;
    const metrics = pendingMetrics;
    drag = {
      pane,
      sourcePath: clonePath(path),
      floatingIndex: source.floatingIndex,
      pointerOffsetX: source.pointerOffsetX,
      pointerOffsetY: source.pointerOffsetY,
      dropHandled: false,
      headerBounds: header ? { left: header.left, top: header.top, right: header.right, bottom: header.bottom } : null,
      startClientX: metrics && Number.isFinite(metrics.startClientX) ? metrics.startClientX : event.clientX,
      startClientY: metrics && Number.isFinite(metrics.startClientY) ? metrics.startClientY : event.clientY,
    };
    lastDragPoint = { x: drag.startClientX, y: drag.startClientY };
    if (drag.floatingIndex !== null && drag.floatingIndex >= 0) visual({ draggingFloating: drag.floatingIndex });
    updateDragFromPoint(event.clientX, event.clientY);
    startDragTracking();
    // The only tab of a docked stack (or of one stack among several in a
    // floating window) tears off at once: there is nothing to reorder against.
    if (drag && drag.floatingIndex === -1) {
      const location = resolveStackLocation(drag.sourcePath);
      if (location && location.node.panes.length === 1) {
        const floating = location.context === 'floating' ? work.floating[location.index] : null;
        if (location.context === 'docked' || (floating?.root && countPanesInTree(floating.root) > 1)) {
          convertToFloating(event.clientX, event.clientY);
        }
      }
    }
  };

  /** The only pane of a floating window drags the window itself; anything else starts in its header. */
  const preparePaneDragSource = (path: DockPath, pane: string, event: PointerEvent) => {
    const none = { floatingIndex: null, pointerOffsetX: 0, pointerOffsetY: 0 };
    const location = resolveStackLocation(path);
    if (!location || !location.node.panes.includes(pane)) return none;
    const metrics = pendingMetrics;
    const floating = location.context === 'floating' ? work.floating[location.index] : null;
    const alone = !location.node.panes.some((p) => p !== pane);
    if (location.context === 'floating' && floating && alone && (floating.root ? countPanesInTree(floating.root) : 1) <= 1) {
      floating.activePane = pane;
      promoteFloating(location.index);
      liveFloating(location.index);
      const host = hostRect();
      const b = floating.bounds;
      return {
        floatingIndex: location.index,
        pointerOffsetX: metrics ? metrics.pointerOffsetX + (metrics.left - b.left) : Number.isFinite(event.clientX) ? event.clientX - host.left - b.left : b.width / 2,
        pointerOffsetY: metrics ? metrics.pointerOffsetY + (metrics.top - b.top) : Number.isFinite(event.clientY) ? event.clientY - host.top - b.top : b.height / 2,
      };
    }
    return { floatingIndex: -1, pointerOffsetX: metrics?.pointerOffsetX ?? 0, pointerOffsetY: metrics?.pointerOffsetY ?? 0 };
  };

  const pointerOverSourceHeader = (x: number, y: number): boolean => {
    const strip = drag ? stripOf(stackEl(drag.sourcePath)) : null;
    // Unresolvable: treat as inside rather than tear off by accident.
    if (!strip) return true;
    const r = strip.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const inSourceHeader = (x: number, y: number) =>
    !!drag && ((!!drag.headerBounds && isPointWithinBounds(drag.headerBounds, x, y)) || pointerOverSourceHeader(x, y));

  const updateDragFromPoint = (x: number, y: number) => {
    if (!drag || !Number.isFinite(x) || !Number.isFinite(y)) return;
    if (drag.floatingIndex === -1) {
      const outside = !(drag.headerBounds ? isPointWithinBounds(drag.headerBounds, x, y) : true) && !pointerOverSourceHeader(x, y);
      if (outside && Math.hypot(x - drag.startClientX, y - drag.startClientY) > TEAR_OFF_THRESHOLD_PX) convertToFloating(x, y);
    }
    updateDropTarget(x, y);
    const index = drag?.floatingIndex;
    if (!drag || index === null || index === undefined || index < 0) return;
    const floating = work.floating[index];
    if (!floating) return;
    const host = hostRect();
    floating.bounds = { ...floating.bounds, left: x - host.left - drag.pointerOffsetX, top: y - host.top - drag.pointerOffsetY };
    liveFloating(index);
  };

  /** The tab's slot while it is dragged inside its own strip: the placeholder's index among the other tabs. */
  const headerIndexAt = (stack: HTMLElement, x: number): number => {
    const tabs = Array.from(stripOf(stack)?.children ?? []).filter((el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains('dock-tab'));
    const placeholder = tabs.find((t) => t.dataset['placeholder'] === 'true') ?? null;
    const targets = tabs.filter((t) => t !== placeholder && t.dataset['pane'] && t.dataset['pane'] !== drag?.pane);
    if (targets.length === 0) return 0;
    const base = placeholder?.getBoundingClientRect() ?? null;
    const center = base && Number.isFinite(base.width) && base.width > 0 ? base.left + base.width / 2 : null;
    return headerInsertIndex(
      targets.map((t) => {
        const r = t.getBoundingClientRect();
        return r.left + r.width / 2;
      }),
      x,
      center,
    );
  };

  const setHeaderDrag = (stack: HTMLElement | null, index: number) => {
    if (!drag || !stack) {
      if (api.state().visual.headerDrag) visual({ headerDrag: null });
      return;
    }
    const current = api.state().visual.headerDrag;
    const path = stack.dataset['path'] ?? '';
    if (current && current.path === path && current.index === index) return;
    const tab = Array.from(stripOf(stack)?.children ?? []).find((el) => (el as HTMLElement).dataset?.['pane'] === drag?.pane) as HTMLElement | undefined;
    const width = current?.width ?? tab?.offsetWidth ?? 0;
    visual({ headerDrag: { path, pane: drag.pane, index, width } });
  };

  const updateDropTarget = (x: number, y: number) => {
    if (!drag) return;
    const stack = findStackAtPoint(x, y);
    const path = stack ? parsePath(stack.dataset['path']) : null;
    if (!stack || !path) {
      // Hit-testing misses transiently near the joystick: keep a visible one.
      if (!joystick) hideDropIndicator();
      setHeaderDrag(null, 0);
      return;
    }
    if (joystick && joystick.path !== stack.dataset['path']) joystick = null;
    // Inside its own strip a tab reorders: a placeholder follows the pointer.
    if (drag.floatingIndex === -1 && pathsEqual(path, drag.sourcePath) && inSourceHeader(x, y)) {
      setHeaderDrag(stack, headerIndexAt(stack, x));
      hideDropIndicator();
      return;
    }
    setHeaderDrag(null, 0);
    const zone = computeDropZone(stack, { clientX: x, clientY: y }, findDropZoneByPoint(x, y));
    showDropIndicator(stack, zone);
  };

  const convertToFloating = (x: number, y: number) => {
    const state = drag;
    if (!state || (state.floatingIndex !== null && state.floatingIndex >= 0)) return;
    setHeaderDrag(null, 0);
    const location = resolveStackLocation(state.sourcePath);
    if (!location) return;
    const host = hostRect();
    const stackRect = stackEl(state.sourcePath)?.getBoundingClientRect() ?? null;
    const metrics = pendingMetrics;
    const width = metrics && metrics.width > 0 ? metrics.width : stackRect && stackRect.width > 0 ? stackRect.width : 320;
    const height = metrics && metrics.height > 0 ? metrics.height : stackRect && stackRect.height > 0 ? stackRect.height : 240;
    // In place of the stack it leaves (its border lined up with the stack's),
    // clamped so a tab torn off near an edge lands inside the dock.
    const bounds = clampBoundsToHost(
      {
        left: metrics ? metrics.left - FLOATING_BORDER : Number.isFinite(x) ? x - host.left - width / 2 : 0,
        top: metrics ? metrics.top - FLOATING_BORDER : Number.isFinite(y) ? y - host.top - height / 2 : 0,
        width,
        height,
      },
      hostSize(),
    );
    removePaneFromLocation(location, state.pane);
    work.floating.push({ bounds, root: { kind: 'stack', panes: [state.pane], activePane: state.pane }, activePane: state.pane });
    const index = work.floating.length - 1;
    promoteFloating(index);
    // Normalizing may drop an emptied floating window before ours.
    const before = work.floating.length;
    normalize();
    const newIndex = index - (before - work.floating.length);
    state.sourcePath = { type: 'floating', index: newIndex, segments: [] };
    state.floatingIndex = newIndex;
    // The cursor keeps its offset into the new window: no jump on the next move.
    state.pointerOffsetX = Number.isFinite(x) ? x - host.left - bounds.left : bounds.width / 2;
    state.pointerOffsetY = Number.isFinite(y) ? y - host.top - bounds.top : bounds.height / 2;
    announce(dockLabel(labels().tornOff, { title: title(state.pane) }));
    commit();
    visual({ draggingFloating: newIndex });
    liveFloating(newIndex);
  };

  let dragTracking = false;
  const onDragMove = (event: PointerEvent) => {
    if (!drag) {
      stopDragTracking();
      return;
    }
    lastDragPoint = { x: event.clientX, y: event.clientY };
    updateDragFromPoint(event.clientX, event.clientY);
  };
  const onDragUp = (event: PointerEvent) => {
    if (drag) {
      const x = Number.isFinite(event.clientX) ? event.clientX : lastDragPoint?.x;
      const y = Number.isFinite(event.clientY) ? event.clientY : lastDragPoint?.y;
      if (x !== undefined && y !== undefined) finalizeDrop(x, y);
    }
    afterDragRelease();
  };
  /** An OS-level cancel ends the drag without committing a drop. */
  const onDragCancel = () => afterDragRelease();
  function startDragTracking() {
    if (dragTracking || !win) return;
    win.addEventListener('pointermove', onDragMove, true);
    win.addEventListener('pointerup', onDragUp, true);
    win.addEventListener('pointercancel', onDragCancel, true);
    dragTracking = true;
  }
  function stopDragTracking() {
    if (!dragTracking || !win) return;
    win.removeEventListener('pointermove', onDragMove, true);
    win.removeEventListener('pointerup', onDragUp, true);
    win.removeEventListener('pointercancel', onDragCancel, true);
    dragTracking = false;
    lastDragPoint = null;
  }

  const afterDragRelease = () => {
    if (!drag) {
      stopDragTracking();
      return;
    }
    if (pendingDragEnd !== null) return;
    // Deferred past the click that follows the pointerup.
    pendingDragEnd = setTimeout(() => {
      pendingDragEnd = null;
      endPaneDrag();
      pendingMetrics = null;
    }, 0);
  };

  const endPaneDrag = () => {
    if (pendingDragEnd !== null) {
      clearTimeout(pendingDragEnd);
      pendingDragEnd = null;
    }
    const state = drag;
    drag = null;
    joystick = null;
    stopDragTracking();
    visual({ headerDrag: null, indicator: null, joystick: null, draggingFloating: null, floatingLive: null });
    if (state && state.floatingIndex !== null && !state.dropHandled) commit();
  };

  const finalizeDrop = (x: number, y: number) => {
    if (!drag) return;
    const stack = findStackAtPoint(x, y);
    const stackPath = stack ? parsePath(stack.dataset['path']) : null;
    const path = (joystick ? parsePath(joystick.path) : null) ?? stackPath;
    const zone: DropZone | null = joystick?.zone ?? (stack ? computeDropZone(stack, { clientX: x, clientY: y }, null) : null);
    // Released inside its own strip with no side chosen: a reorder.
    if (drag.floatingIndex === -1 && stack && stackPath && pathsEqual(stackPath, drag.sourcePath) && (!zone || zone === 'center')) {
      const location = resolveStackLocation(stackPath);
      if (location) {
        reorderPaneInLocation(location, drag.pane, headerIndexAt(stack, x));
        drag.dropHandled = true;
        visual({ headerDrag: null });
        commit();
        return;
      }
    }
    if (path && zone) handleDrop(path, zone);
  };

  /** Drop the dragged pane on a stack's zone. Sets `drag.dropHandled` on success. */
  const handleDrop = (targetPath: DockPath, zone: DropZone) => {
    if (!drag) return;
    const { pane, sourcePath } = drag;
    const source = resolveStackLocation(sourcePath);
    const target = resolveStackLocation(targetPath);
    const done = () => {
      normalize();
      commit();
      if (drag) drag.dropHandled = true;
    };
    // The empty main area takes the pane as its only stack.
    if (!target && targetPath.type === 'docked' && !work.root) {
      if (!source) return;
      removePaneFromLocation(source, pane);
      work.root = { kind: 'stack', panes: [pane], activePane: pane };
      done();
      return;
    }
    if (!source || !target) return;
    if (zone === 'center' && pathsEqual(sourcePath, targetPath)) {
      if (!source.node.panes.includes(pane)) return;
      reorderPaneInLocation(source, pane);
      done();
      return;
    }
    removePaneFromLocation(source, pane);
    if (zone === 'center') {
      addPaneToLocation(target, pane);
      setActivePaneForLocation(target, pane);
      done();
      return;
    }
    const stack: DockStackNode = { kind: 'stack', panes: [pane], activePane: pane };
    if (target.context === 'docked') {
      work.root = dockNodeBeside(work.root, target.node, stack, zone);
    } else {
      const floating = work.floating[target.index];
      if (!floating) {
        normalize();
        commit();
        return;
      }
      floating.root = dockNodeBeside(floating.root, target.node, stack, zone);
      floating.activePane = pane;
    }
    done();
  };

  /** Drop a whole floating window onto a stack. */
  const handleFloatingStackDrop = (sourceIndex: number, targetPath: DockPath, zone: DropZone): boolean => {
    const source = work.floating[sourceIndex];
    if (!source?.root) return false;
    const target = resolveStackLocation(targetPath);
    const sourceRoot = source.root;
    const finish = () => {
      removeFloatingAt(sourceIndex);
      normalize();
      return true;
    };
    if (!target && targetPath.type === 'docked' && !work.root) {
      work.root = cloneLayoutNode(sourceRoot);
      return finish();
    }
    if (!target || (target.context === 'floating' && target.index === sourceIndex)) return false;
    if (zone === 'center') {
      const panes = collectPaneNames(sourceRoot);
      if (panes.length === 0) return false;
      panes.forEach((pane) => addPaneToLocation(target, pane));
      const active = source.activePane && panes.includes(source.activePane) ? source.activePane : findFirstPaneName(sourceRoot) ?? panes[0];
      if (active) setActivePaneForLocation(target, active);
      return finish();
    }
    if (target.context === 'floating') {
      const floating = work.floating[target.index];
      if (!floating) return false;
      floating.root = dockNodeBeside(floating.root, target.node, sourceRoot, zone);
      floating.activePane = source.activePane ?? findFirstPaneName(sourceRoot) ?? undefined;
      return finish();
    }
    work.root = dockNodeBeside(work.root, target.node, sourceRoot, zone);
    return finish();
  };

  /* ----- tabs ----- */

  const activatePane = (path: DockPath, pane: string) => {
    const location = resolveStackLocation(path);
    if (!location) return;
    setActivePaneForLocation(location, pane);
    commit();
    api.emit('paneActivated', { pane });
  };

  const tabOrigin = (tab: HTMLElement): { pane: string; path: DockPath } | null => {
    const pane = tab.dataset['pane'];
    const path = parsePath(tab.closest<HTMLElement>('.dock-stack')?.dataset['path']);
    return pane && path ? { pane, path } : null;
  };

  const onTabKeyDown = (event: KeyboardEvent, tab: HTMLElement) => {
    const origin = tabOrigin(tab);
    const strip = tab.parentElement;
    if (!origin || !strip || event.key === 'Enter' || event.key === ' ') return;
    const tabs = Array.from(strip.children).filter((el): el is HTMLElement => el.classList.contains('dock-tab') && !!(el as HTMLElement).dataset['pane']);
    const rtl = (win?.getComputedStyle(root).direction ?? 'ltr') === 'rtl';
    const target = rovingTarget(
      event.key,
      { count: tabs.length, from: tabs.indexOf(tab), orientation: 'horizontal', wrap: true, rtl },
      { altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey },
    );
    if (target === null) return;
    event.preventDefault();
    const next = tabs[target];
    const pane = next?.dataset['pane'];
    if (!next || !pane) return;
    focusPane = pane;
    next.focus();
    activatePane(origin.path, pane);
  };

  /* ----- keyboard move mode ----- */

  const focusedTabOrigin = () => {
    const active = doc.activeElement;
    return active instanceof HTMLElement && active.classList.contains('dock-tab') && own(active) ? tabOrigin(active) : null;
  };

  const buildCandidates = (): PaneMoveCandidate[] => {
    const sourcePathStr = paneMove ? formatPath(paneMove.sourcePath) : null;
    const stacks: { pathStr: string; targetTitles: string }[] = [];
    forEachStack(work.root, (stack, segments) => {
      const pathStr = formatPath({ type: 'docked', segments });
      if (pathStr !== sourcePathStr) stacks.push({ pathStr, targetTitles: stack.panes.map(title).join(', ') });
    });
    return [
      ...stacks.flatMap(({ pathStr, targetTitles }) => PANE_MOVE_ZONE_ORDER.map((zone) => ({ pathStr, zone, targetTitles }))),
      { pathStr: null, zone: 'float' as const, targetTitles: '' },
    ];
  };

  const clearPaneMove = () => {
    paneMove = null;
    if (paneMoveIndex !== null) {
      paneMoveIndex = null;
      hideDropIndicator();
    }
  };

  const zoneLabel = (zone: DropZone) => {
    const l = labels();
    return { top: l.dropTop, right: l.dropRight, bottom: l.dropBottom, left: l.dropLeft, center: l.dropCenter }[zone];
  };

  const cycleCandidate = (delta: number) => {
    const candidates = buildCandidates();
    const current = paneMoveIndex;
    const next = current === null ? (delta > 0 ? 0 : candidates.length - 1) : (current + delta + candidates.length) % candidates.length;
    paneMoveIndex = next;
    const candidate = candidates[next];
    hideDropIndicator();
    const stack = candidate.zone === 'float' ? null : stackEl(candidate.pathStr);
    const rect = stack?.getBoundingClientRect();
    // A zero-size stack (not laid out) would draw at the origin; the announcement suffices.
    if (stack && rect && rect.width > 0 && rect.height > 0 && candidate.zone !== 'float') showDropIndicator(stack, candidate.zone);
    const l = labels();
    const label =
      candidate.zone === 'float'
        ? l.float
        : dockLabel(l.candidateZone, { zone: `${candidate.zone[0].toUpperCase()}${candidate.zone.slice(1)}`, titles: candidate.targetTitles });
    announce(dockLabel(l.candidate, { label, position: next + 1, count: candidates.length }));
  };

  const commitMoveToZone = (zone: DropZone, targetPath?: DockPath | null) => {
    const move = paneMove;
    if (!move) return;
    drag = {
      pane: move.paneName,
      sourcePath: clonePath(move.sourcePath),
      floatingIndex: null,
      pointerOffsetX: 0,
      pointerOffsetY: 0,
      dropHandled: false,
      headerBounds: null,
      startClientX: 0,
      startClientY: 0,
    };
    handleDrop(targetPath ?? move.sourcePath, zone);
    // Announce what happened, not what was asked for.
    const succeeded = (drag as PaneDrag | null)?.dropHandled === true;
    drag = null;
    clearPaneMove();
    focusPane = move.paneName;
    announce(dockLabel(succeeded ? labels().docked : labels().moveFailed, { title: title(move.paneName), zone }));
  };

  const commitMoveAsFloat = () => {
    const move = paneMove;
    if (!move) return;
    const source = resolveStackLocation(move.sourcePath);
    if (!source) {
      clearPaneMove();
      return;
    }
    removePaneFromLocation(source, move.paneName);
    const offset = 100 + work.floating.length * 24;
    work.floating.push({
      bounds: { left: offset, top: offset, width: 320, height: 200 },
      root: { kind: 'stack', panes: [move.paneName], activePane: move.paneName },
      activePane: move.paneName,
    });
    normalize();
    commit();
    clearPaneMove();
    focusPane = move.paneName;
    announce(dockLabel(labels().tornOff, { title: title(move.paneName) }));
  };

  const commitHighlighted = () => {
    if (paneMoveIndex === null) return;
    const candidate = buildCandidates()[paneMoveIndex];
    if (!candidate) clearPaneMove();
    else if (candidate.zone === 'float') commitMoveAsFloat();
    else commitMoveToZone(candidate.zone, parsePath(candidate.pathStr));
  };

  const onMoveModeKey = (event: KeyboardEvent) => {
    const consume = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    if (event.key === 'Escape') {
      consume();
      clearPaneMove();
      announce(labels().moveCancelled);
      return;
    }
    // Letters typed into a pane's own field are text, not commands.
    if (isEditable(event.composedPath()[0] ?? null)) return;
    const delta = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number | undefined>)[event.key];
    if (delta) {
      consume();
      cycleCandidate(delta);
      return;
    }
    if (event.key === 'Enter') {
      // Nothing highlighted: leave Enter to the tab.
      if (paneMoveIndex === null) return;
      consume();
      commitHighlighted();
      return;
    }
    const choice = ({ t: 'top', r: 'right', b: 'bottom', l: 'left', f: 'float' } as Record<string, DropZone | 'float' | undefined>)[event.key.toLowerCase()];
    if (!choice) return;
    consume();
    if (choice === 'float') commitMoveAsFloat();
    else commitMoveToZone(choice);
  };

  /* ----- delegated listeners ----- */

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target;
    if (closestOwn(target, '.dock-floating__close')) {
      // The chrome would otherwise start a drag on the close button.
      event.stopPropagation();
      return;
    }
    const resizer = closestOwn(target, '.dock-floating__resizer');
    if (resizer) {
      const index = floatingIndexOf(resizer);
      if (index >= 0) beginFloatingResize(event, index, resizer);
      return;
    }
    const chrome = closestOwn(target, '.dock-floating__chrome');
    if (chrome) {
      const index = floatingIndexOf(chrome);
      if (index >= 0) beginFloatingDrag(event, index, chrome);
      return;
    }
    const handle = closestOwn(target, '.dock-intersection-handle');
    if (handle) {
      beginCornerResize(event, handle);
      return;
    }
    const tab = closestOwn(target, '.dock-tab[data-pane]');
    const origin = tab ? tabOrigin(tab) : null;
    if (tab && origin) {
      // No preventDefault: on touch it would suppress the click that activates the tab.
      captureTabDragMetrics(event, tab.closest<HTMLElement>('.dock-stack'));
      armPaneDrag(event, origin.path, origin.pane, tab);
    }
  };

  const onClick = (event: MouseEvent) => {
    const close = closestOwn(event.target, '.dock-floating__close');
    if (close) {
      event.stopPropagation();
      const index = floatingIndexOf(close);
      if (index >= 0) closeFloatingPane(index);
      return;
    }
    const tab = closestOwn(event.target, '.dock-tab[data-pane]');
    const origin = tab ? tabOrigin(tab) : null;
    if (origin) activatePane(origin.path, origin.pane);
  };

  const onDblClick = (event: MouseEvent) => {
    const handle = closestOwn(event.target, '.dock-intersection-handle');
    if (handle) onIntersectionDoubleClick(event, handle);
  };

  /** Capture phase: move mode sees its keys before anything inside a pane does. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (paneMove) {
      onMoveModeKey(event);
      return;
    }
    const target = event.target;
    if ((event.key === 'm' || event.key === 'M') && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const origin = focusedTabOrigin();
      if (origin) {
        event.preventDefault();
        event.stopPropagation();
        paneMove = { paneName: origin.pane, sourcePath: origin.path };
        paneMoveIndex = null;
        announce(dockLabel(labels().moveMode, { title: title(origin.pane) }));
        return;
      }
    }
    const handle = closestOwn(target, '.dock-intersection-handle');
    if (handle) {
      onIntersectionKeyDown(event, handle);
      return;
    }
    const resizer = closestOwn(target, '.dock-floating__resizer');
    if (resizer) {
      const index = floatingIndexOf(resizer);
      if (index >= 0) onFloatingResizeKeydown(event, index, resizer);
      return;
    }
    const tab = closestOwn(target, '.dock-tab[data-pane]');
    if (tab && tab === target) onTabKeyDown(event, tab);
  };

  /** The pane whose tab had focus, so focus can follow it through a re-render. */
  let focusPane: string | null = null;
  const onFocusIn = (event: FocusEvent) => {
    const tab = closestOwn(event.target, '.dock-tab[data-pane]');
    focusPane = tab ? (tab.dataset['pane'] ?? null) : null;
  };
  const onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    // Focus leaving the dock entirely cancels an armed move.
    if (paneMove && next && !root.contains(next)) {
      clearPaneMove();
      announce(labels().moveCancelled);
    }
    if (next) focusPane = closestOwn(next, '.dock-tab[data-pane]')?.dataset['pane'] ?? null;
  };

  /* ----- after each render ----- */

  const parking = () => ownAll('.dock-parking')[0] ?? null;

  /** Seat every pane host in the panel showing it; park the rest. */
  const seatPaneHosts = () => {
    const bodies = new Map<string, HTMLElement>();
    ownAll('[data-dock-pane-body]').forEach((body) => bodies.set(body.dataset['dockPaneBody'] ?? '', body));
    const park = parking();
    hosts.forEach((host, name) => {
      const home = bodies.get(name) ?? park;
      if (home && host.parentElement !== home) home.appendChild(host);
    });
  };

  const restoreFocus = () => {
    const active = doc.activeElement;
    if (!focusPane || (active && active !== doc.body)) return;
    const tab = ownAll('.dock-tab[data-pane]').find((t) => t.dataset['pane'] === focusPane);
    tab?.focus();
  };

  const verifyIntegrity = () => {
    if (!api.inputs().debugLayoutIntegrity || drag) return;
    const tabs = new Set(ownAll('.dock-tab[data-pane]').map((t) => t.dataset['pane']));
    const missing = dockPaneNames(work).find((pane) => !tabs.has(pane));
    if (missing) {
      throw new Error(
        `mp-dock-manager: pane "${missing}" has no tab. The layout tree got into a state the renderer can't display — likely a missing normalize() or a render bug.`,
      );
    }
  };

  let rendered: number | null = null;
  const frame = (fn: () => void) => (win?.requestAnimationFrame ? win.requestAnimationFrame(fn) : setTimeout(fn, 16));
  const afterRender = () => {
    seatPaneHosts();
    restoreFocus();
    verifyIntegrity();
    if (rendered !== null) return;
    rendered = frame(() => {
      rendered = null;
      pushSplitSizes();
      scheduleIntersections();
    }) as number;
  };

  const insideHost = (node: Node) => [...hosts.values()].some((host) => host.contains(node));
  const observer = new MutationObserver((records) => {
    // Pane content changing is the consumer's business, not a relayout.
    if (records.every((r) => insideHost(r.target))) return;
    afterRender();
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-dock-pane-body'] });

  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
    const size = hostSize();
    const current = api.state().visual.hostSize;
    if (!current || current.width !== size.width || current.height !== size.height) visual({ hostSize: size });
    scheduleIntersections();
  });
  resizeObserver?.observe(root);

  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('click', onClick);
  root.addEventListener('dblclick', onDblClick);
  root.addEventListener('keydown', onKeyDown, { capture: true });
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);

  engines.set(root, {
    splitResizeEnd: (pathStr, detail) => {
      const path = parsePath(pathStr);
      const node = path ? resolveSplitNode(path, work.root, work.floating) : null;
      const sizes = detail?.sizes ?? [];
      if (!node || sizes.length !== node.children.length) return;
      const previousTotal = (node.sizes ?? []).reduce((s, w) => s + Math.max(w, 0), 0);
      const total = sizes.reduce((s, v) => s + Math.max(v, 0), 0);
      if (total <= 0) return;
      const targetTotal = previousTotal > 0 ? previousTotal : sizes.length;
      node.sizes = sizes.map((px) => (Math.max(px, 0) / total) * targetTotal);
      const splitter = splitterAt(path);
      if (splitter) pushed.set(splitter, JSON.stringify(node.sizes));
      commit();
      scheduleIntersections();
    },
    splitResizing: () => scheduleIntersections(),
    // A consumer layout is adopted unless a gesture owns the layout right now.
    adopt: (input) => {
      if (interacting()) return;
      const next = normalizeDockSnapshot(cloneDockSnapshot(toDockSnapshot(input)));
      if (JSON.stringify(next) === JSON.stringify(work)) return;
      work = next;
      syncPaneHosts();
      api.setState({ layout: cloneDockSnapshot(work) });
    },
  });

  syncPaneHosts();
  visual({ hostSize: hostSize() });
  afterRender();

  return () => {
    engines.delete(root);
    observer.disconnect();
    resizeObserver?.disconnect();
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('click', onClick);
    root.removeEventListener('dblclick', onDblClick);
    root.removeEventListener('keydown', onKeyDown, { capture: true });
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    [...cleanups].forEach((cleanup) => cleanup());
    stopDragTracking();
    stopPointerTrackingIfIdle(true);
    if (intersectionTimer !== null) clearTimeout(intersectionTimer);
    if (pendingDragEnd !== null) clearTimeout(pendingDragEnd);
    unsubscribe();
    announcer.destroy();
  };
}

export const dockCore = defineCore<DockInputs, DockState, { view: DockView }, DockEvents, undefined, undefined, DockMethods>({
  state: (inputs) => ({
    layout: normalizeDockSnapshot(cloneDockSnapshot(toDockSnapshot(inputs.layout))),
    visual: DOCK_VISUAL_IDLE,
    paneHosts: [],
    announcement: '',
  }),
  view: ({ inputs, state, id, hydrated, label, api }) => ({
    view: connectDock({
      id,
      hydrated,
      label,
      labels: mergeDockLabels(inputs.labels),
      layout: state.layout,
      visual: state.visual,
      announcement: state.announcement,
      paneHosts: state.paneHosts,
      onResizeEnd: (path, detail) => engineOf(api())?.splitResizeEnd(path, detail),
      onResizing: () => engineOf(api())?.splitResizing(),
    }),
  }),
  attach: attachDock,
  inputsChanged: (api, prev) => {
    if (api.inputs().layout !== prev.layout) engineOf(api)?.adopt(api.inputs().layout);
  },
  methods: {
    captureLayout: (api) => cloneDockSnapshot(api.state().layout),
  },
});
