import { hydratedAttr } from '@mintplayer/ui-core/store';
import type { SplitterResizeEventDetail } from '@mintplayer/ui-core/splitter';
import type {
  DockFloatingPaneBounds,
  DockFloatingStackLayout,
  DockLayout,
  DockLayoutNode,
  DockLayoutSnapshot,
  DockStackNode,
} from './dock-layout';
import {
  clampBoundsToHost,
  cloneLayoutNode,
  findFirstPaneName,
  floatingZIndex,
  formatPath,
  normalizeFloatingLayout,
  normalizeLayoutNode,
  collectPaneNames,
  type DockPath,
  type DropZone,
  type FloatingResizeEdges,
} from './core';

/**
 * The dock's pure half (PRD #437 D10): the attribute bags and the tree the
 * templates render, computed from the layout snapshot and the core's visual
 * state. Nothing here touches the DOM; `dock.core.ts` measures, hit-tests and
 * commits.
 */

export const DOCK_SCOPE = 'dock';

export type DockBag = Record<string, string | number | boolean | null>;

/** Every string the dock shows or speaks. `{name}` placeholders are filled in. */
export interface DockLabels {
  /** The region's name when the consumer gives no `aria-label`. */
  dock: string;
  floatingTitle: string;
  /** `{title}` */
  closeFloating: string;
  /** `{edge}`: `top`, `bottom-left`, ... */
  resizeEdge: string;
  /** `{edge}` */
  resizeCorner: string;
  intersection: string;
  emptyTab: string;
  emptyStack: string;
  dropTop: string;
  dropLeft: string;
  dropCenter: string;
  dropRight: string;
  dropBottom: string;
  /** `{title}` */
  moveMode: string;
  moveCancelled: string;
  /** `{title}` */
  tornOff: string;
  /** `{title}`, `{zone}` */
  docked: string;
  /** `{title}` */
  moveFailed: string;
  /** `{title}` */
  closed: string;
  /** `{label}`, `{position}`, `{count}` */
  candidate: string;
  float: string;
  /** `{zone}`, `{titles}` */
  candidateZone: string;
}

export const DOCK_LABELS: DockLabels = {
  dock: 'Dock layout',
  floatingTitle: 'Floating Pane',
  closeFloating: 'Close pane: {title}',
  resizeEdge: 'Resize pane edge {edge}',
  resizeCorner: 'Resize pane corner {edge}',
  intersection: 'Resize split intersection',
  emptyTab: '(empty)',
  emptyStack: 'No panes configured',
  dropTop: 'Dock to top',
  dropLeft: 'Dock to left',
  dropCenter: 'Dock to center',
  dropRight: 'Dock to right',
  dropBottom: 'Dock to bottom',
  moveMode:
    'Move mode for pane {title}. Press T, R, B, or L to dock to top, right, bottom, or left of the current stack, F to float, arrow keys to cycle drop targets, Enter to commit, Escape to cancel.',
  moveCancelled: 'Move cancelled.',
  tornOff: 'Pane {title} torn off into a floating window.',
  docked: 'Pane {title} docked to {zone}.',
  moveFailed: 'Move failed. Pane {title} was not moved.',
  closed: 'Closed floating pane {title}.',
  candidate: '{label}, option {position} of {count}.',
  float: 'Float',
  candidateZone: '{zone} of {titles}',
};

/** Fill a label's `{name}` placeholders. */
export function dockLabel(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** The eight floating-window resize handles, in render order. */
export const FLOATING_RESIZERS: readonly { readonly edge: string; readonly edges: FloatingResizeEdges }[] = [
  { edge: 'top-left', edges: { horizontal: 'left', vertical: 'top' } },
  { edge: 'top', edges: { horizontal: 'none', vertical: 'top' } },
  { edge: 'top-right', edges: { horizontal: 'right', vertical: 'top' } },
  { edge: 'right', edges: { horizontal: 'right', vertical: 'none' } },
  { edge: 'bottom-right', edges: { horizontal: 'right', vertical: 'bottom' } },
  { edge: 'bottom', edges: { horizontal: 'none', vertical: 'bottom' } },
  { edge: 'bottom-left', edges: { horizontal: 'left', vertical: 'bottom' } },
  { edge: 'left', edges: { horizontal: 'left', vertical: 'none' } },
];

export function floatingResizeEdges(edge: string | null | undefined): FloatingResizeEdges | null {
  return FLOATING_RESIZERS.find((r) => r.edge === edge)?.edges ?? null;
}

/** The joystick's 3x3 grid, row by row; null cells are spacers. */
export const JOYSTICK_CELLS: readonly (DropZone | null)[] = [null, 'top', null, 'left', 'center', 'right', null, 'bottom', null];

const JOYSTICK_GLYPHS: Record<DropZone, string> = { top: '↑', left: '←', center: '•', right: '→', bottom: '↓' };

export function isDropZone(value: string | null | undefined): value is DropZone {
  return value === 'left' || value === 'right' || value === 'top' || value === 'bottom' || value === 'center';
}

/* ----- layout snapshots ----- */

export const EMPTY_DOCK_LAYOUT: DockLayoutSnapshot = { root: null, floating: [], titles: {} };

/** Any accepted layout shape as a snapshot (a bare node is the docked root). */
export function toDockSnapshot(value: DockLayoutSnapshot | DockLayout | DockLayoutNode | null | undefined): DockLayoutSnapshot {
  if (!value) return { root: null, floating: [], titles: {} };
  if ((value as DockLayoutNode).kind) return { root: value as DockLayoutNode, floating: [], titles: {} };
  const layout = value as DockLayout | DockLayoutSnapshot;
  return {
    root: layout.root ?? null,
    floating: Array.isArray(layout.floating) ? layout.floating.map((floating) => normalizeFloatingLayout(floating)) : [],
    titles: layout.titles ? { ...layout.titles } : {},
  };
}

/** A deep copy: the core mutates its working tree, never the consumer's. */
export function cloneDockSnapshot(snapshot: DockLayoutSnapshot): DockLayoutSnapshot {
  return {
    root: cloneLayoutNode(snapshot.root),
    floating: JSON.parse(JSON.stringify(snapshot.floating)) as DockFloatingStackLayout[],
    titles: { ...(snapshot.titles ?? {}) },
  };
}

/**
 * The canonical form: empty stacks pruned, 0/1-child splits collapsed,
 * same-direction splits flattened, floating windows without content dropped
 * and every floating window's `activePane` pointing at a pane it holds.
 */
export function normalizeDockSnapshot(snapshot: DockLayoutSnapshot): DockLayoutSnapshot {
  const floating = snapshot.floating
    .map((window) => {
      const root = normalizeLayoutNode(window.root);
      if (!root) return null;
      const panes = collectPaneNames(root);
      const next: DockFloatingStackLayout = { ...window, root };
      if (!next.activePane || !panes.includes(next.activePane)) {
        const fallback = findFirstPaneName(root);
        if (fallback) next.activePane = fallback;
        else delete next.activePane;
      }
      return next;
    })
    .filter((window): window is DockFloatingStackLayout => window !== null);
  return { root: normalizeLayoutNode(snapshot.root), floating, titles: snapshot.titles ?? {} };
}

/** Every pane the layout places, docked first. */
export function dockPaneNames(snapshot: DockLayoutSnapshot): string[] {
  return [...collectPaneNames(snapshot.root), ...snapshot.floating.flatMap((window) => collectPaneNames(window.root))];
}

export function dockTitle(snapshot: DockLayoutSnapshot, pane: string): string {
  return snapshot.titles?.[pane] ?? pane;
}

export function floatingTitle(snapshot: DockLayoutSnapshot, window: DockFloatingStackLayout | undefined, labels: DockLabels): string {
  if (!window?.root) return labels.floatingTitle;
  const preferred = window.activePane ?? findFirstPaneName(window.root);
  return preferred ? dockTitle(snapshot, preferred) : labels.floatingTitle;
}

/* ----- ids ----- */

const slug = (value: string, fallback: string) => {
  const raw = value.replace(/[^a-zA-Z0-9_-]/g, '-');
  return raw.length > 0 ? raw : fallback;
};

export function dockPathSlug(path: DockPath): string {
  const base = path.segments.length ? path.segments.join('-') : 'root';
  return path.type === 'floating' ? `f${path.index}-${base}` : base;
}

export function dockTabId(rootId: string, path: DockPath, pane: string): string {
  return `${rootId}-tab-${dockPathSlug(path)}-${slug(pane, 'pane')}`;
}

export function dockPanelId(rootId: string, path: DockPath, pane: string): string {
  return `${rootId}-panel-${dockPathSlug(path)}-${slug(pane, 'pane')}`;
}

/* ----- visual state ----- */

/** A crossing of two dividers, measured by the core and rendered as a handle. */
export interface DockIntersection {
  readonly key: string;
  /** Dock-relative px. */
  readonly x: number;
  readonly y: number;
  /** JSON of the divider pairs the handle drives. */
  readonly pairs: string;
  /** The vertical divider's position, as a percent of the dock's width. */
  readonly valueNow: number;
}

export interface DockRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface DockJoystick {
  readonly left: number;
  readonly top: number;
  readonly z: number;
  readonly path: string;
  readonly zone: DropZone | null;
  /** The empty main area: only `center` is offered. */
  readonly centerOnly: boolean;
}

/** An in-header tab drag: the dragged tab leaves the strip and a placeholder takes slot `index`. */
export interface DockHeaderDrag {
  readonly path: string;
  readonly pane: string;
  readonly index: number;
  readonly width: number;
}

export interface DockVisualState {
  readonly intersections: readonly DockIntersection[];
  readonly resizingIntersection: string | null;
  readonly indicator: (DockRect & { readonly z: number }) | null;
  readonly joystick: DockJoystick | null;
  /** The floating window under a drag: transparent to hit-testing. */
  readonly draggingFloating: number | null;
  /** Live bounds and stacking of a floating window under a drag or resize, committed at the end. */
  readonly floatingLive: { readonly index: number; readonly bounds: DockFloatingPaneBounds; readonly z: number } | null;
  readonly resizingFloating: { readonly index: number; readonly edge: string } | null;
  readonly headerDrag: DockHeaderDrag | null;
  /** The tab id under a touch long-press. */
  readonly pressing: string | null;
  readonly hostSize: { readonly width: number; readonly height: number } | null;
}

export const DOCK_VISUAL_IDLE: DockVisualState = {
  intersections: [],
  resizingIntersection: null,
  indicator: null,
  joystick: null,
  draggingFloating: null,
  floatingLive: null,
  resizingFloating: null,
  headerDrag: null,
  pressing: null,
  hostSize: null,
};

/* ----- the rendered tree ----- */

export type DockStyle = Record<string, string>;

export interface DockTabView {
  readonly key: string;
  readonly title: string;
  readonly placeholder: boolean;
  readonly bag: DockBag;
  readonly style: DockStyle;
}

export interface DockStackView {
  readonly strip: DockBag;
  readonly tabs: readonly DockTabView[];
  /** The panel; its pane host is re-seated into it by the core, so the template renders it empty. */
  readonly body: DockBag;
  readonly empty: string | null;
}

/**
 * One layout node: `.dock-split` around a splitter, or `.dock-stack` with its
 * tablist. The split's fields are flat and never null (a stack has no
 * children and inert handlers) because a front reads them inside closures,
 * where a narrowed `split` would be lost.
 */
export interface DockNodeView {
  readonly bag: DockBag;
  readonly split: boolean;
  readonly direction: 'horizontal' | 'vertical';
  readonly children: readonly { readonly key: string; readonly node: DockNodeView }[];
  readonly onResizeEnd: (detail: SplitterResizeEventDetail) => void;
  readonly onResizing: (detail: SplitterResizeEventDetail) => void;
  readonly stack: DockStackView | null;
}

const NOT_A_SPLIT = { split: false, direction: 'horizontal', children: [], onResizeEnd: () => undefined, onResizing: () => undefined } as const;

export interface DockFloatingView {
  readonly key: string;
  readonly bag: DockBag;
  readonly style: DockStyle;
  readonly chrome: DockBag;
  readonly title: DockBag;
  readonly titleText: string;
  readonly close: DockBag;
  readonly content: DockBag;
  readonly node: DockNodeView | null;
  readonly resizers: readonly { readonly key: string; readonly bag: DockBag }[];
}

export interface DockPaneView {
  readonly name: string;
  readonly host: HTMLElement;
}

export interface DockView {
  readonly root: DockBag;
  readonly docked: DockBag;
  readonly dockedNode: DockNodeView | null;
  readonly floatingLayer: DockBag;
  readonly floating: readonly DockFloatingView[];
  readonly intersectionLayer: DockBag;
  readonly intersections: readonly { readonly key: string; readonly bag: DockBag; readonly style: DockStyle }[];
  readonly indicator: DockBag;
  readonly indicatorStyle: DockStyle;
  readonly joystick: DockBag;
  readonly joystickStyle: DockStyle;
  readonly joystickCells: readonly { readonly key: string; readonly button: boolean; readonly bag: DockBag; readonly glyph: string }[];
  readonly live: DockBag;
  /** Where the core parks the hosts of panes no tab is showing; rendered empty and hidden. */
  readonly parking: DockBag;
  readonly announcement: string;
  readonly panes: readonly DockPaneView[];
}

export interface DockViewOptions {
  readonly id: string;
  readonly hydrated: boolean;
  readonly label: string | null;
  readonly labels: DockLabels;
  readonly layout: DockLayoutSnapshot;
  readonly visual: DockVisualState;
  readonly announcement: string;
  readonly paneHosts: readonly DockPaneView[];
  readonly onResizeEnd: (path: string, detail: SplitterResizeEventDetail) => void;
  readonly onResizing: (path: string) => void;
}

const px = (value: number) => `${value}px`;

function stackView(node: DockStackNode, path: DockPath, o: DockViewOptions): DockNodeView {
  const pathStr = formatPath(path);
  const panes = Array.from(new Set(node.panes));
  const root = { class: 'dock-stack', 'data-path': pathStr };
  if (panes.length === 0) {
    return {
      bag: root,
      ...NOT_A_SPLIT,
      stack: {
        strip: { class: 'dock-stack__strip', role: 'tablist' },
        tabs: [{ key: '__empty__', title: o.labels.emptyTab, placeholder: true, bag: { class: 'dock-tab', 'aria-hidden': 'true' }, style: {} }],
        body: { class: 'dock-stack__pane' },
        empty: o.labels.emptyStack,
      },
    };
  }
  const active = panes.includes(node.activePane ?? '') ? (node.activePane as string) : panes[0];
  const live = o.hydrated;
  const drag = o.visual.headerDrag?.path === pathStr ? o.visual.headerDrag : null;
  const tabs: DockTabView[] = panes
    .filter((pane) => pane !== drag?.pane)
    .map((pane) => {
      const tabId = dockTabId(o.id, path, pane);
      const selected = pane === active;
      return {
        key: pane,
        title: dockTitle(o.layout, pane),
        placeholder: false,
        style: {},
        bag: {
          type: 'button',
          class: `dock-tab${selected ? ' active' : ''}`,
          id: tabId,
          role: 'tab',
          'aria-selected': selected ? 'true' : 'false',
          'aria-controls': dockPanelId(o.id, path, pane),
          tabindex: selected ? '0' : '-1',
          'data-pane': pane,
          'data-tab-id': tabId,
          'data-pressing': o.visual.pressing === tabId ? 'true' : null,
          disabled: live ? null : true,
        },
      };
    });
  if (drag) {
    const index = Math.max(0, Math.min(drag.index, tabs.length));
    tabs.splice(index, 0, {
      key: '__dock-placeholder__',
      title: dockTitle(o.layout, drag.pane),
      placeholder: true,
      style: { '--dock-placeholder-width': px(drag.width) },
      bag: { class: 'dock-tab dock-tab--placeholder', 'aria-hidden': 'true', 'data-placeholder': 'true' },
    });
  }
  return {
    bag: { ...root, 'data-active-pane': active },
    ...NOT_A_SPLIT,
    stack: {
      strip: { class: 'dock-stack__strip', role: 'tablist' },
      tabs,
      body: {
        class: 'dock-stack__pane',
        role: 'tabpanel',
        id: dockPanelId(o.id, path, active),
        'aria-labelledby': dockTabId(o.id, path, active),
        'data-dock-pane-body': active,
      },
      empty: null,
    },
  };
}

function nodeView(node: DockLayoutNode, path: DockPath, o: DockViewOptions): DockNodeView {
  if (node.kind === 'stack') return stackView(node, path, o);
  const pathStr = formatPath(path);
  return {
    bag: { class: 'dock-split', 'data-path': pathStr, 'data-direction': node.direction },
    stack: null,
    split: true,
    direction: node.direction,
    children: node.children.map((child, index) => ({
      key: String(index),
      node: nodeView(child, { ...path, segments: [...path.segments, index] }, o),
    })),
    onResizeEnd: (detail) => o.onResizeEnd(pathStr, detail),
    onResizing: () => o.onResizing(pathStr),
  };
}

function floatingView(window: DockFloatingStackLayout, index: number, o: DockViewOptions): DockFloatingView {
  const path: DockPath = { type: 'floating', index, segments: [] };
  const pathStr = formatPath(path);
  const override = o.visual.floatingLive?.index === index ? o.visual.floatingLive : null;
  const live = override ? override.bounds : window.bounds;
  const host = o.visual.hostSize;
  const bounds = host && host.width > 0 && host.height > 0 ? clampBoundsToHost(live, host) : live;
  const titleId = `${o.id}-floating-${index}-title`;
  const title = floatingTitle(o.layout, window, o.labels);
  const resizing = o.visual.resizingFloating?.index === index ? o.visual.resizingFloating.edge : null;
  return {
    key: pathStr,
    bag: {
      class: 'dock-floating',
      'data-path': pathStr,
      role: 'dialog',
      'aria-labelledby': titleId,
      'aria-modal': 'false',
      'data-dragging': o.visual.draggingFloating === index ? 'true' : null,
    },
    style: {
      '--dock-left': px(bounds.left),
      '--dock-top': px(bounds.top),
      '--dock-width': px(bounds.width),
      '--dock-height': px(bounds.height),
      '--dock-z': String(override ? override.z : floatingZIndex(window, index)),
    },
    chrome: { class: 'dock-floating__chrome' },
    title: { class: 'dock-floating__title', id: titleId },
    titleText: title,
    close: {
      type: 'button',
      class: 'dock-floating__close',
      'aria-label': dockLabel(o.labels.closeFloating, { title }),
      disabled: o.hydrated ? null : true,
    },
    content: { class: 'dock-floating__stack' },
    node: window.root ? nodeView(window.root, path, o) : null,
    resizers: FLOATING_RESIZERS.map(({ edge, edges }) => {
      const corner = edges.horizontal !== 'none' && edges.vertical !== 'none';
      const percent =
        host && host.width > 0 && host.height > 0
          ? edges.horizontal !== 'none'
            ? (bounds.width / host.width) * 100
            : (bounds.height / host.height) * 100
          : 0;
      return {
        key: edge,
        bag: {
          class: `dock-floating__resizer dock-floating__resizer--${edge}`,
          role: 'separator',
          'aria-orientation': corner ? null : edges.horizontal === 'none' ? 'horizontal' : 'vertical',
          'aria-label': dockLabel(corner ? o.labels.resizeCorner : o.labels.resizeEdge, { edge }),
          tabindex: o.hydrated ? '0' : null,
          'aria-valuemin': '0',
          'aria-valuemax': '100',
          'aria-valuenow': String(Math.round(Math.min(100, Math.max(0, percent)))),
          'data-edge': edge,
          'data-resizing': resizing === edge ? 'true' : null,
        },
      };
    }),
  };
}

export function connectDock(o: DockViewOptions): DockView {
  const { visual, labels } = o;
  const indicator = visual.indicator;
  const joystick = visual.joystick;
  const dropLabels: Record<DropZone, string> = {
    top: labels.dropTop,
    left: labels.dropLeft,
    center: labels.dropCenter,
    right: labels.dropRight,
    bottom: labels.dropBottom,
  };
  return {
    root: { class: 'dock', role: 'region', 'aria-label': o.label ?? labels.dock, ...hydratedAttr(o.hydrated) },
    docked: { class: 'dock-docked', 'data-path': formatPath({ type: 'docked', segments: [] }) },
    dockedNode: o.layout.root ? nodeView(o.layout.root, { type: 'docked', segments: [] }, o) : null,
    floatingLayer: { class: 'dock-floating-layer' },
    floating: o.layout.floating.map((window, index) => floatingView(window, index, o)),
    intersectionLayer: { class: 'dock-intersections-layer' },
    intersections: visual.intersections.map((handle) => ({
      key: handle.key,
      style: { '--dock-left': px(handle.x), '--dock-top': px(handle.y) },
      bag: {
        class: 'dock-intersection-handle',
        role: 'separator',
        'aria-label': labels.intersection,
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': String(handle.valueNow),
        tabindex: '0',
        'data-key': handle.key,
        'data-pairs': handle.pairs,
        'data-resizing': visual.resizingIntersection === handle.key ? 'true' : null,
      },
    })),
    indicator: { class: 'dock-drop-indicator', 'data-visible': indicator ? 'true' : 'false' },
    indicatorStyle: indicator
      ? {
          '--dock-left': px(indicator.left),
          '--dock-top': px(indicator.top),
          '--dock-width': px(indicator.width),
          '--dock-height': px(indicator.height),
          '--dock-z': String(indicator.z),
        }
      : {},
    joystick: {
      class: 'dock-drop-joystick',
      'data-visible': joystick ? 'true' : 'false',
      'data-path': joystick?.path ?? null,
      'data-zone': joystick?.zone ?? null,
    },
    joystickStyle: joystick ? { '--dock-left': px(joystick.left), '--dock-top': px(joystick.top), '--dock-z': String(joystick.z) } : {},
    joystickCells: JOYSTICK_CELLS.map((zone, index): DockView['joystickCells'][number] =>
      zone
        ? {
            key: zone,
            button: true,
            glyph: JOYSTICK_GLYPHS[zone],
            bag: {
              type: 'button',
              tabindex: '-1',
              class: 'dock-drop-joystick__button',
              'data-zone': zone,
              'aria-label': dropLabels[zone],
              'data-active': joystick?.zone === zone ? 'true' : null,
              'data-hidden': joystick?.centerOnly && zone !== 'center' ? 'true' : null,
            },
          }
        : { key: `spacer-${index}`, button: false, glyph: '', bag: { class: 'dock-drop-joystick__spacer' } },
    ),
    live: { class: 'visually-hidden', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
    parking: { class: 'dock-parking', hidden: true },
    announcement: o.announcement,
    panes: o.paneHosts,
  };
}
