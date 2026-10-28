import type { CoreBag } from '@mintplayer/ui-core/component';
import { resolveSides } from './resolve-sides';
import type { TimelineConnectorContext, TimelineItemContext } from './models/context';
import type { TimelineAlign, TimelineItem, TimelineOrientation, TimelineSelectable } from './models/timeline-item';

/** The scope of the timeline group's sheet: `[data-mps=timeline]`. */
export const TIMELINE_SCOPE = 'timeline';

/** An attribute bag for one node. */
export type TimelineBag = CoreBag;

/** Keys of the selected rows. */
export type TimelineKeys = readonly string[];

const scoped = (bag: TimelineBag): TimelineBag => ({ ...bag, 'data-mps': TIMELINE_SCOPE });

/**
 * What every row needs from its timeline: how items are reached and which one
 * holds the tab stop. The timeline hands it to declarative items as context,
 * and uses it for its own data rows.
 */
export interface TimelineRowsContext {
  readonly selectable: TimelineSelectable;
  readonly activatable: boolean;
  /** Keys of the selected rows. */
  readonly selected: TimelineKeys;
  /** Key of the row holding the roving tab stop; null until the timeline is live. */
  readonly activeKey: string | null;
}

/** Outside a timeline: a presentational row. */
export const NO_TIMELINE: TimelineRowsContext = { selectable: 'none', activatable: false, selected: [], activeKey: null };

/** Rows are keyboard-reachable when selectable, or opted in through `activatable`. */
export const isRoving = (ctx: TimelineRowsContext): boolean => ctx.selectable !== 'none' || ctx.activatable;

/**
 * A listitem may not be interactive, so the row role follows what rows are:
 * options of a listbox, buttons of a group (activatable only), or list items.
 */
export function rowRole(ctx: TimelineRowsContext): 'option' | 'button' | 'listitem' {
  if (ctx.selectable !== 'none') return 'option';
  return ctx.activatable ? 'button' : 'listitem';
}

export interface TimelineRowOptions {
  /** Stable key: the item id, else (data rows) the source index or (items) the instance id. */
  key: string;
  /** The consumer's id for the item, echoed so the timeline can rebuild the model. */
  itemId?: string | null;
  /** Source index of a data row. */
  index?: number;
  disabled?: boolean;
  /** An extra class on a data row (`TimelineItem.cssClass`). */
  cssClass?: string;
}

/** The bag on one row: role, selection and tab stop from the timeline's context. */
export function rowBag(ctx: TimelineRowsContext, row: TimelineRowOptions): TimelineBag {
  const role = rowRole(ctx);
  const selecting = ctx.selectable !== 'none';
  const selected = selecting && ctx.selected.includes(row.key);
  const interactive = role !== 'listitem';
  return scoped({
    class: ['timeline-item', selected ? 'timeline-item-selected' : null, row.disabled ? 'timeline-item-disabled' : null, row.cssClass]
      .filter(Boolean)
      .join(' '),
    role,
    'data-tl-key': row.key,
    'data-item-id': row.itemId ?? null,
    'data-index': row.index ?? null,
    'aria-selected': selecting ? (selected ? 'true' : 'false') : null,
    'aria-disabled': interactive && row.disabled ? 'true' : null,
    // No tab stop until the timeline is live: with JS off a row cannot act.
    tabindex: isRoving(ctx) && ctx.activeKey !== null ? (ctx.activeKey === row.key ? 0 : -1) : null,
  });
}

/** The fixed regions of a row, shared by data rows and declarative items. */
export interface TimelineRowParts {
  opposite: TimelineBag;
  line: TimelineBag;
  marker: TimelineBag;
  dot: TimelineBag;
  connector: TimelineBag;
  content: TimelineBag;
  heading: TimelineBag;
  body: TimelineBag;
}

export const ROW_PARTS: TimelineRowParts = {
  opposite: scoped({ class: 'timeline-opposite' }),
  line: scoped({ class: 'timeline-line' }),
  marker: scoped({ class: 'timeline-marker' }),
  dot: scoped({ class: 'timeline-dot' }),
  connector: scoped({ class: 'timeline-connector' }),
  content: scoped({ class: 'timeline-content' }),
  heading: scoped({ class: 'timeline-heading' }),
  body: scoped({ class: 'timeline-body' }),
};

/** The marker's default icon: a decorative `<i class>`. */
export const iconBag = (icon: string | null | undefined): TimelineBag | null =>
  icon ? scoped({ class: icon, 'aria-hidden': 'true' }) : null;

/** The accent colour, carried as a custom property on the line (marker + connector). */
export const accentStyle = (color: string | null | undefined): Record<string, string> =>
  color ? { '--mp-tl-item-color': color } : {};

/** A time as shown in the opposite region. */
export const timeText = (time: string | Date | null | undefined): string =>
  time == null ? '' : time instanceof Date ? time.toLocaleDateString() : time;

/** The key of a data row: its id, else its source index. */
export const dataKey = (item: TimelineItem, index: number): string => String(item.id ?? index);

export interface TimelineOptions extends TimelineRowsContext {
  items: readonly TimelineItem[] | null;
  orientation: TimelineOrientation;
  align: TimelineAlign;
  reverse: boolean;
  /** Accessible name of the list. */
  label: string | null;
}

export interface TimelineRowView {
  key: string;
  item: TimelineItem;
  bag: TimelineBag;
  style: Record<string, string>;
  icon: TimelineBag | null;
  time: string;
  ctx: TimelineItemContext;
  connector: TimelineConnectorContext;
}

export interface TimelineView {
  root: TimelineBag;
  /** Data rows; null renders the default slot (declarative items). */
  rows: TimelineRowView[] | null;
  parts: TimelineRowParts;
}

/**
 * The timeline's view. Side, the last connector and reverse are CSS on the
 * root's classes, so a declarative item never needs its index and the server
 * render is already laid out.
 */
export function connectTimeline(options: TimelineOptions): TimelineView {
  const role = options.selectable !== 'none' ? 'listbox' : options.activatable ? 'group' : 'list';
  const items = options.items?.length ? options.items : null;
  const sides = items ? resolveSides(items.length, options.align, options.reverse) : [];
  const enabled = items?.map((item, i) => (item.disabled ? null : dataKey(item, i))).filter((k): k is string => k !== null) ?? [];
  // Data rows are known on the server, so the tab stop is too; declarative
  // items get theirs once the timeline is live.
  const activeKey = options.activeKey !== null && enabled.includes(options.activeKey) ? options.activeKey : (enabled[0] ?? null);
  const rowsCtx: TimelineRowsContext = { ...options, activeKey: items ? activeKey : options.activeKey };
  return {
    root: scoped({
      class: [
        'timeline',
        `timeline-${options.orientation}`,
        `timeline-align-${options.align}`,
        options.reverse ? 'timeline-reverse' : null,
      ].filter(Boolean).join(' '),
      role,
      'aria-label': options.label,
      // Only a widget takes aria-orientation; on list/group it is invalid.
      'aria-orientation': role === 'listbox' ? options.orientation : null,
      'aria-multiselectable': options.selectable === 'multiple' ? 'true' : null,
    }),
    rows: items
      ? items.map((item, index) => {
          const key = dataKey(item, index);
          const visualIndex = options.reverse ? items.length - 1 - index : index;
          return {
            key,
            item,
            bag: rowBag(rowsCtx, { key, itemId: item.id == null ? null : String(item.id), index, disabled: !!item.disabled, cssClass: item.cssClass }),
            style: accentStyle(item.color),
            icon: iconBag(item.icon),
            time: timeText(item.time),
            ctx: {
              index,
              visualIndex,
              isFirst: visualIndex === 0,
              isLast: visualIndex === items.length - 1,
              orientation: options.orientation,
              side: sides[index],
            },
            connector: { index, fromItem: item, toItem: items[index + 1], orientation: options.orientation },
          };
        })
      : null,
    parts: ROW_PARTS,
  };
}

export interface TimelineItemOptions {
  key: string;
  itemId: string | null;
  title: string | null;
  description: string | null;
  time: string | null;
  icon: string | null;
  color: string | null;
  disabled: boolean;
}

export interface TimelineItemView extends TimelineRowParts {
  root: TimelineBag;
  lineStyle: Record<string, string>;
  icon: TimelineBag | null;
  title: string;
  description: string;
  time: string;
}

/** One declarative item: a row whose role and state come from the enclosing timeline. */
export function connectTimelineItem(ctx: TimelineRowsContext, options: TimelineItemOptions): TimelineItemView {
  return {
    ...ROW_PARTS,
    root: rowBag(ctx, { key: options.key, itemId: options.itemId, disabled: options.disabled }),
    lineStyle: accentStyle(options.color),
    icon: iconBag(options.icon),
    title: options.title ?? '',
    description: options.description ?? '',
    time: options.time ?? '',
  };
}
