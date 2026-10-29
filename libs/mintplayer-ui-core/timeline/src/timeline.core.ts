import { defineContext, defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import {
  NO_TIMELINE,
  connectTimeline,
  connectTimelineItem,
  isRoving,
  type TimelineItemView,
  type TimelineKeys,
  type TimelineRowsContext,
  type TimelineView,
} from './timeline';
import type { TimelineItemClickDetail, TimelineSelectionChangeDetail } from './models/context';
import type { TimelineAlign, TimelineItem, TimelineOrientation, TimelineSelectable } from './models/timeline-item';

/**
 * The timeline group's cores (PRD #437 D10): what the generated Angular, React,
 * Vue and Lit components host. `timeline.component.ts` is their manifest and
 * `templates/` their markup.
 *
 * Layout is CSS only: side, reverse and the last connector are classes on the
 * timeline and `:nth-child` / `:last-child` rules on its rows, so neither the
 * server nor a declarative item ever needs an index. Selection and the roving
 * tab stop are the timeline's: it handles clicks and keys for every row by
 * delegation, and hands its state to declarative items as context.
 */
export const TIMELINE_ROWS = defineContext<TimelineRowsContext>('timeline-rows', NO_TIMELINE);

const ALIGNS = new Set<string>(['start', 'end', 'alternate', 'alternate-reverse']);
const SELECTABLES = new Set<string>(['none', 'single', 'multiple']);

export interface TimelineInputs {
  /** Data rows. Empty or null renders the declarative items (the default slot) instead. */
  items?: readonly TimelineItem[] | null;
  orientation: TimelineOrientation;
  align: TimelineAlign;
  /** Flips the render order through the flex axis; the DOM keeps source order. */
  reverse: boolean;
  selectable: TimelineSelectable;
  /** Click-only rows that must still be keyboard-reachable: buttons with a roving tab stop. */
  activatable: boolean;
  /** Keys of the selected rows: an item's `id`, else a data row's index or a declarative item's own id. Two-way. */
  selectedIds: TimelineKeys;
  /** The list's accessible name; an `aria-label` on the component wins. */
  inputLabel: string | null;
}

export interface TimelineState {
  selectedIds: TimelineKeys;
  activeKey: string | null;
  anchorKey: string | null;
}

export interface TimelineEvents {
  itemClick: TimelineItemClickDetail;
  selectionChanged: TimelineSelectionChangeDetail;
  selectedIdsChange: TimelineKeys;
}

type Api = CoreApi<TimelineInputs, TimelineState, TimelineEvents>;

const orientationOf = (v: string | null | undefined): TimelineOrientation => (v === 'horizontal' ? 'horizontal' : 'vertical');
const alignOf = (v: string | null | undefined): TimelineAlign => (v && ALIGNS.has(v) ? (v as TimelineAlign) : 'start');
const selectableOf = (v: string | null | undefined): TimelineSelectable => (v && SELECTABLES.has(v) ? (v as TimelineSelectable) : 'none');

function rowsContext(inputs: Readonly<TimelineInputs>, state: Readonly<TimelineState>): TimelineRowsContext {
  return {
    selectable: selectableOf(inputs.selectable),
    activatable: !!inputs.activatable,
    selected: state.selectedIds,
    activeKey: state.activeKey,
  };
}

/** The rows, in DOM order: every child of the root that carries a row key. */
const rowsOf = (api: Api): HTMLElement[] =>
  [...api.host.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute('data-tl-key'));

const keyOf = (row: Element): string => row.getAttribute('data-tl-key') ?? '';
const enabled = (row: Element): boolean => !row.classList.contains('timeline-item-disabled');

/** The model behind a row: the data item, or one rebuilt from a declarative item's text. */
function modelOf(api: Api, row: HTMLElement): TimelineItem {
  const index = row.getAttribute('data-index');
  const items = api.inputs().items;
  if (index !== null && items?.[+index]) return items[+index];
  const text = (cls: string) => row.querySelector(`:scope > * > .${cls}, :scope > .${cls}`)?.textContent?.trim() || undefined;
  return {
    id: row.getAttribute('data-item-id') ?? keyOf(row),
    title: text('timeline-heading'),
    description: text('timeline-body'),
    time: text('timeline-opposite'),
    disabled: !enabled(row),
  };
}

/** The tab stop: the active row while it is enabled, else the first enabled row. */
function tabStop(api: Api, rows: HTMLElement[]): string | null {
  const live = rows.filter(enabled).map(keyOf);
  const active = api.state().activeKey;
  return active !== null && live.includes(active) ? active : (live[0] ?? null);
}

function syncTabStop(api: Api) {
  if (!isRoving(rowsContext(api.inputs(), api.state()))) return;
  const key = tabStop(api, rowsOf(api));
  if (key !== api.state().activeKey) api.setState({ activeKey: key });
}

function select(api: Api, rows: HTMLElement[], row: HTMLElement, opts: { toggle: boolean; range: boolean }) {
  const mode = selectableOf(api.inputs().selectable);
  const key = keyOf(row);
  const before = api.state().selectedIds;
  const anchor = api.state().anchorKey;
  const anchorIndex = anchor === null ? -1 : rows.findIndex((r) => keyOf(r) === anchor);
  let next: string[];
  let nextAnchor = key;
  if (mode === 'single') {
    next = [key];
  } else if (opts.range && anchorIndex >= 0) {
    const index = rows.indexOf(row);
    const [lo, hi] = [Math.min(anchorIndex, index), Math.max(anchorIndex, index)];
    const range = rows.slice(lo, hi + 1).filter(enabled).map(keyOf);
    next = [...before, ...range.filter((k) => !before.includes(k))];
    nextAnchor = anchor as string;
  } else if (opts.toggle) {
    next = before.includes(key) ? before.filter((k) => k !== key) : [...before, key];
  } else {
    next = [key];
  }
  api.setState({ selectedIds: next, anchorKey: nextAnchor });
  const added = next.filter((k) => !before.includes(k));
  const removed = before.filter((k) => !next.includes(k));
  if (!added.length && !removed.length) return;
  const models = (keys: TimelineKeys) =>
    keys.flatMap((k) => {
      const r = rows.find((el) => keyOf(el) === k);
      return r ? [modelOf(api, r)] : [];
    });
  api.emit('selectedIdsChange', next);
  api.emit('selectionChanged', { selected: models(next), added: models(added), removed: models(removed) });
}

/** The next enabled row from `from`, wrapping; `from` -1 starts at the tab stop. */
function step(api: Api, rows: HTMLElement[], from: number, dir: 1 | -1): number {
  const n = rows.length;
  const stop = tabStop(api, rows);
  const start = from >= 0 ? from : rows.findIndex((r) => keyOf(r) === stop);
  return Array.from({ length: n }, (_, k) => (((start + dir * (k + 1)) % n) + n) % n).find((i) => enabled(rows[i])) ?? -1;
}

function target(api: Api, rows: HTMLElement[], key: string, current: number): number | undefined {
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return step(api, rows, current, 1);
    case 'ArrowUp':
    case 'ArrowLeft':
      return step(api, rows, current, -1);
    case 'Home':
      return rows.findIndex(enabled);
    case 'End':
      return rows.reduce((last, r, i) => (enabled(r) ? i : last), -1);
    default:
      return undefined;
  }
}

export const timelineCore = defineCore<
  TimelineInputs,
  TimelineState,
  { view: TimelineView },
  TimelineEvents,
  undefined,
  TimelineRowsContext
>({
  provides: TIMELINE_ROWS,
  state: (inputs) => ({ selectedIds: inputs.selectedIds ?? [], activeKey: null, anchorKey: null }),
  view: ({ inputs, state, label }) => ({
    view: connectTimeline({
      ...rowsContext(inputs, state),
      label: label ?? inputs.inputLabel ?? null,
      items: inputs.items ?? null,
      orientation: orientationOf(inputs.orientation),
      align: alignOf(inputs.align),
      reverse: !!inputs.reverse,
    }),
  }),
  provide: ({ inputs, state }) => rowsContext(inputs, state),
  attach: (api) => {
    const root = api.host;
    const rowFrom = (ev: Event) => {
      const rows = rowsOf(api);
      const row = rows.find((r) => r.contains(ev.target as Node)) ?? null;
      return { rows, row, index: row ? rows.indexOf(row) : -1 };
    };
    const onClick = (ev: MouseEvent) => {
      const { rows, row, index } = rowFrom(ev);
      if (!row || !enabled(row)) return;
      api.emit('itemClick', { item: modelOf(api, row), index, originalEvent: ev });
      const ctx = rowsContext(api.inputs(), api.state());
      if (!isRoving(ctx)) return;
      api.setState({ activeKey: keyOf(row) });
      if (ctx.selectable !== 'none') select(api, rows, row, { toggle: ev.ctrlKey || ev.metaKey, range: ev.shiftKey });
    };
    const onKeydown = (ev: KeyboardEvent) => {
      const ctx = rowsContext(api.inputs(), api.state());
      if (!isRoving(ctx)) return;
      const { rows, row, index } = rowFrom(ev);
      if (!rows.length) return;
      const to = target(api, rows, ev.key, index);
      if (to !== undefined) {
        ev.preventDefault();
        if (to < 0) return;
        api.setState({ activeKey: keyOf(rows[to]) });
        // tabindex=-1 rows are focusable already; the re-render moves the tab stop.
        rows[to].focus();
        return;
      }
      if ((ev.key !== 'Enter' && ev.key !== ' ') || !row || !enabled(row)) return;
      ev.preventDefault();
      if (ctx.selectable === 'none') {
        api.emit('itemClick', { item: modelOf(api, row), index, originalEvent: ev });
        return;
      }
      select(api, rows, row, { toggle: ev.key === ' ' && ctx.selectable === 'multiple', range: ev.shiftKey });
    };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeydown);
    // Declarative items come and go: keep one enabled row holding the tab stop.
    const observer = new MutationObserver(() => syncTabStop(api));
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    syncTabStop(api);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
      observer.disconnect();
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    if (inputs.selectedIds !== prev.selectedIds && inputs.selectedIds !== api.state().selectedIds) {
      api.setState({ selectedIds: inputs.selectedIds ?? [] });
    }
    if (inputs.selectable !== prev.selectable || inputs.activatable !== prev.activatable || inputs.items !== prev.items) {
      queueMicrotask(() => syncTabStop(api));
    }
  },
});

export interface TimelineItemInputs {
  /** The item's id: its selection key and the `id` of its model in events. */
  itemId?: string | null;
  /** The heading text; the `heading` slot replaces it. */
  itemTitle?: string | null;
  /** Body text; the default slot replaces it. */
  description?: string | null;
  /** Shown in the opposite region; the `opposite` slot replaces it. */
  time?: string | null;
  /** Icon class for the default marker (e.g. a Bootstrap Icons class). */
  icon?: string | null;
  /** Accent colour of the marker and the trailing connector. */
  color?: string | null;
  disabled: boolean;
}

export const timelineItemCore = defineCore<TimelineItemInputs, object, { view: TimelineItemView }, Record<never, never>, TimelineRowsContext>({
  consume: TIMELINE_ROWS,
  view: ({ inputs, context, id }) => ({
    view: connectTimelineItem(context, {
      key: inputs.itemId ?? id,
      itemId: inputs.itemId ?? null,
      title: inputs.itemTitle ?? null,
      description: inputs.description ?? null,
      time: inputs.time ?? null,
      icon: inputs.icon ?? null,
      color: inputs.color ?? null,
      disabled: !!inputs.disabled,
    }),
  }),
});
