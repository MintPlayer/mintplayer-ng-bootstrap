import {
  dateService,
  formatMessage,
  getContrastColor,
  getReadableTextColor,
  isResource,
  isResourceGroup,
  resolveCapability,
  resolveEventColor,
  resolveMessages,
  resolveResizeEdge,
  resourceService,
  timelineService,
  type DayOfWeek,
  type Resource,
  type ResourceGroup,
  type SchedulerCapability,
  type SchedulerEvent,
  type SchedulerEventPart,
  type SchedulerMessages,
  type SchedulerOptions,
  type TimeSlot,
  type ViewType,
} from '@mintplayer/ui-core/scheduler-core';
import type { FirstDayOfWeek } from '@mintplayer/ui-core/calendar';
import { hydratedAttr } from '@mintplayer/ui-core/store';
import type { ModelBinding } from '@mintplayer/ui-core/component';
import type { TimeStep } from '@mintplayer/ui-core/timepicker';
import { formatCellAnnouncement, formatEventAriaLabel, isSlotInSelection, partGeometry, toDayKey } from './format';
import type { SchedulerState } from './state/scheduler-state';

/**
 * The scheduler's pure half (PRD #437 D10, spike S7): every view is a static
 * grid whose events are positioned by custom properties the sheet turns into
 * geometry (slots × `--scheduler-slot-height` / `--scheduler-slot-width`), so
 * the server renders the same grid the client does and nothing is measured.
 * `scheduler.core.ts` owns the behaviour; this only turns a state snapshot into
 * the attribute bags the templates render.
 */

export const SCHEDULER_SCOPE = 'scheduler';

/** The timeline's bucket row for events with no (known) resource. */
export const UNASSIGNED_ROW_ID = '__mp-unassigned__';

export type SchedulerBag = Record<string, string | number | boolean | null>;
export type SchedulerStyle = Record<string, string>;

export type RowAction = 'rename-resource' | 'add-resource' | 'add-group' | 'set-resource-color' | 'delete-resource';

/** The built-in event editor's working copy. */
export interface SchedulerEditorDraft {
  title: string;
  start: Date;
  end: Date;
  color: string | null;
  inheritColor: boolean;
}

/** UI state outside the state manager: popups, the rename field, the header mode. */
export interface SchedulerUi {
  popover: { date: Date; scope: 'day' | 'month'; anchorId: string | null } | null;
  rowMenu: string | null;
  editor: { eventId: string; draft: SchedulerEditorDraft; error: { field: 'title' | 'end'; message: string } | null } | null;
  renaming: string | null;
  narrow: boolean;
  /**
   * The timeline's resource column: the separator's percent once measured, and
   * the px width once the user resized it (null until then, so the default
   * width keeps following the container).
   */
  column: { width: number | null; percent: number } | null;
  /** The current time for the now indicator; null on the server and before hydration. */
  now: number | null;
}

export const SCHEDULER_UI_IDLE: SchedulerUi = {
  popover: null,
  rowMenu: null,
  editor: null,
  renaming: null,
  narrow: false,
  column: null,
  now: null,
};

export interface SchedulerViewArgs {
  id: string;
  label: string | null;
  /** False in server HTML and until the core attaches; drives data-mp-hydrated. */
  hydrated: boolean;
  s: SchedulerState;
  ui: SchedulerUi;
  eventEditor: boolean;
  announcement: string;
  editorStart: ModelBinding<Date | null>;
  editorEnd: ModelBinding<Date | null>;
}

/* ----------------------------------------------------------------------- */
/* helpers                                                                  */
/* ----------------------------------------------------------------------- */

export const schedulerMessage = (
  options: SchedulerOptions,
  key: keyof SchedulerMessages,
  params?: Record<string, string | number>,
): string => formatMessage(resolveMessages(options.messages)[key], params);

export const firstDayOfWeek = (options: SchedulerOptions): DayOfWeek =>
  dateService.resolveFirstDayOfWeek(options.firstDayOfWeek, options.locale);

export const can = (s: SchedulerState, capability: SchedulerCapability, event?: SchedulerEvent | null): boolean =>
  resolveCapability(capability, { permissions: s.resolvedPermissions, event: event ?? null });

/** Localized display name of a view (also the view-switcher button text). */
export function viewLabel(options: SchedulerOptions, view: ViewType): string {
  const keys: Record<ViewType, keyof SchedulerMessages> = {
    year: 'viewYear',
    month: 'viewMonth',
    week: 'viewWeek',
    day: 'viewDay',
    timeline: 'viewTimeline',
  };
  return schedulerMessage(options, keys[view]);
}

/** Every action the row panel offers for `item`, from the permission table. */
export function rowActions(s: SchedulerState, item: Resource | ResourceGroup): RowAction[] {
  const actions: RowAction[] = [];
  if (can(s, 'updateResource')) actions.push('rename-resource');
  if (isResourceGroup(item)) {
    if (can(s, 'createResource')) actions.push('add-resource');
    if (can(s, 'createGroup')) actions.push('add-group');
  }
  if (can(s, 'updateResource')) actions.push('set-resource-color');
  if (can(s, 'deleteResource')) actions.push('delete-resource');
  return actions;
}

export function findResourceOrGroup(items: (Resource | ResourceGroup)[], id: string): Resource | ResourceGroup | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (isResourceGroup(item)) {
      const found = findResourceOrGroup(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** An event's fill and text colour, as the custom properties the sheet reads. */
function eventColors(s: SchedulerState, event: SchedulerEvent): SchedulerStyle {
  const background = resolveEventColor(event, s.resourceById, s.options.defaultEventColor);
  return { '--scheduler-event-bg': background, '--scheduler-event-fg': event.textColor ?? getContrastColor(background) };
}

export interface SchedulerHandle {
  key: string;
  bag: SchedulerBag;
  glyph: SchedulerBag;
}

/** The start/end resize handles of an event part, per edge permission. */
function resizeHandles(s: SchedulerState, part: SchedulerEventPart, [startClass, endClass]: [string, string]): SchedulerHandle[] {
  const permissions = s.resolvedPermissions;
  const handle = (position: string, edge: 'start' | 'end'): SchedulerHandle => ({
    key: edge,
    bag: { class: `resize-handle ${position}`, 'data-handle': edge },
    glyph: { class: 'resize-glyph', 'aria-hidden': 'true' },
  });
  return [
    ...(part.isStart && resolveResizeEdge('start', { permissions, event: part.event }) ? [handle(startClass, 'start')] : []),
    ...(part.isEnd && resolveResizeEdge('end', { permissions, event: part.event }) ? [handle(endClass, 'end')] : []),
  ];
}

export interface SchedulerEventBox {
  key: string;
  bag: SchedulerBag;
  style: SchedulerStyle;
  content: SchedulerBag;
  titleBag: SchedulerBag;
  title: string;
  timeBag: SchedulerBag | null;
  time: string;
  handles: SchedulerHandle[];
}

export interface SchedulerPreviewBox {
  key: string;
  bag: SchedulerBag;
  style: SchedulerStyle;
}

function eventButton(s: SchedulerState, event: SchedulerEvent, className: string, resourceTitle: string | null): SchedulerBag {
  const selected = s.selectedEvent?.id === event.id;
  return {
    class: `${className}${selected ? ' selected' : ''}`,
    role: 'button',
    tabindex: 0,
    'aria-label': formatEventAriaLabel(event, resourceTitle, s.options),
    'aria-pressed': selected ? 'true' : 'false',
    'aria-describedby': null,
    'data-event-id': event.id,
    // The event's own times, as the cells carry theirs.
    'data-start': event.start.toISOString(),
    'data-end': event.end.toISOString(),
  };
}

/* ----------------------------------------------------------------------- */
/* week / day                                                               */
/* ----------------------------------------------------------------------- */

export interface SchedulerTimeGrid {
  headerRow: SchedulerBag;
  gutterSpace: SchedulerBag;
  headers: {
    key: string;
    bag: SchedulerBag;
    nameBag: SchedulerBag;
    name: string;
    numberBag: SchedulerBag;
    number: string;
    monthYearBag: SchedulerBag | null;
    monthYear: string;
  }[];
  grid: SchedulerBag;
  gutter: SchedulerBag;
  labels: { key: string; bag: SchedulerBag; text: string }[];
  days: SchedulerBag;
  columns: {
    key: string;
    bag: SchedulerBag;
    slots: { key: string; bag: SchedulerBag }[];
    events: SchedulerBag;
    boxes: SchedulerEventBox[];
    previews: SchedulerPreviewBox[];
    now: { bag: SchedulerBag; style: SchedulerStyle } | null;
  }[];
}

function timeGridModel(id: string, s: SchedulerState, ui: SchedulerUi, kbdEvent: string): SchedulerTimeGrid {
  const { options } = s;
  const week = s.view === 'week';
  const days = week ? dateService.getWeekDays(s.date, firstDayOfWeek(options)) : [s.date];
  const messages = resolveMessages(options.messages);
  const rangeStart = new Date(days[0]);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(days[days.length - 1]);
  rangeEnd.setHours(23, 59, 59, 999);

  // Events, split per day and laid out in tracks across the range.
  const parts = timelineService.filterByRange(s.events, rangeStart, rangeEnd).flatMap((event) => timelineService.splitInParts(event).parts);
  const laidOut = timelineService.getTimelinedParts(timelineService.filterPartsByRange(parts, rangeStart, rangeEnd));
  const previewParts = s.previewEvent ? timelineService.splitInParts(s.previewEvent).parts : [];

  const focused = s.focusedCell;
  // Each day on its own wall clock: a DST change day's elapsed-time offsets
  // would put every other day's slots an hour off their rows.
  const cells = days.map((day) => dateService.getTimeSlots(day, options.slotDuration, options.slotMinTime, options.slotMaxTime));
  // A row's label comes from a day whose clock really shows that time (not the
  // missing hour of a spring-forward day).
  const [minHour = 0, minMinute = 0] = (options.slotMinTime ?? '00:00:00').split(':').map(Number);
  const slots = cells[0].map((first, i) => {
    const minutes = minHour * 60 + minMinute + (i * (options.slotDuration ?? 1800)) / 60;
    return cells.map((col) => col[i]).find((slot) => slot.start.getHours() * 60 + slot.start.getMinutes() === minutes) ?? first;
  });
  const anyFocused = !!focused && cells.some((col) => col.some((slot) => slot.start.getTime() === focused.start.getTime()));
  const greyed = (slot: TimeSlot) => !!s.dragState && !!s.previewEvent && slot.start < s.previewEvent.end && slot.end > s.previewEvent.start;
  const now = ui.now !== null && options.nowIndicator ? new Date(ui.now) : null;

  return {
    headerRow: { class: 'scheduler-day-headers', role: 'row' },
    gutterSpace: { class: 'scheduler-time-gutter-space', role: 'presentation' },
    headers: days.map((day): SchedulerTimeGrid['headers'][number] => {
      const today = dateService.isToday(day);
      return {
        key: toDayKey(day),
        bag: { class: `scheduler-day-header${today ? ' today' : ''}`, role: 'columnheader', 'aria-current': today ? 'date' : null },
        nameBag: { class: 'day-name' },
        name: dateService.getDayName(day, options.locale),
        // Week view: the number drills into the day (audit M9). Day view: it is just the date.
        numberBag: week
            ? {
                class: 'day-number',
                role: 'button',
                tabindex: 0,
                'aria-label': formatMessage(messages.openDayView, { date: dateService.formatDateWithWeekday(day, options.locale) }),
                'data-date': toDayKey(day),
              }
            : { class: 'day-number' },
        number: String(day.getDate()),
        monthYearBag: week ? null : { class: 'month-year' },
        monthYear: week ? '' : dateService.formatDate(day, options.locale, { month: 'long', year: 'numeric' }),
      };
    }),
    grid: { class: 'scheduler-time-grid', role: 'presentation' },
    gutter: { class: 'scheduler-time-gutter', role: 'presentation' },
    labels: slots.map((slot, i) => ({
      key: String(i),
      bag: { class: 'scheduler-time-slot-label', role: 'presentation' },
      text: dateService.formatTime(slot.start, options.timeFormat, options.locale),
    })),
    days: { class: 'scheduler-days-container', role: 'presentation' },
    columns: days.map((day, dayIndex) => {
      const boxes = laidOut
        .filter(({ part }) => part.event && dateService.isSameDay(day, part.start))
        .map(({ part, trackIndex, totalTracks, colspan }): SchedulerEventBox => {
          const geometry = partGeometry(part.start, part.end, options) ?? { top: 0, height: 0 };
          return {
            key: part.id,
            bag: { ...eventButton(s, part.event, 'scheduler-event', null), 'aria-describedby': kbdEvent },
            style: {
              ...eventColors(s, part.event),
              '--scheduler-event-top': String(geometry.top),
              '--scheduler-event-height': String(geometry.height),
              '--scheduler-event-left': `${(trackIndex / totalTracks) * 100}%`,
              '--scheduler-event-width': `${(colspan / totalTracks) * 100}%`,
            },
            content: { class: 'event-content' },
            titleBag: { class: 'event-title' },
            title: part.event.title,
            timeBag: { class: 'event-time' },
            time: dateService.formatTimeRange(part.start, part.end, options.timeFormat, options.locale),
            handles: resizeHandles(s, part, ['top', 'bottom']),
          };
        });
      const previews = previewParts
        .filter((part) => dateService.isSameDay(day, part.start))
        .map((part, i): SchedulerPreviewBox | null => {
          const geometry = partGeometry(part.start, part.end, options);
          if (!geometry) return null;
          return {
            key: `preview-${i}`,
            bag: {
              class: `scheduler-event preview${part.isStart ? '' : ' preview-continues-before'}${part.isEnd ? '' : ' preview-continues-after'}`,
            },
            style: { '--scheduler-event-top': String(geometry.top), '--scheduler-event-height': String(geometry.height) },
          };
        })
        .filter((p): p is SchedulerPreviewBox => !!p);
      const minutes = now && dateService.isSameDay(day, now) ? (now.getTime() - new Date(now).setHours(0, 0, 0, 0)) / 60000 : null;
      return {
        key: toDayKey(day),
        bag: {
          class: 'scheduler-day-column',
          role: 'row',
          'data-day-index': week ? dayIndex : null,
          'aria-label': week ? dateService.formatDateWithWeekday(day, options.locale) : null,
          'aria-rowindex': week ? dayIndex + 2 : null,
        },
        slots: cells[dayIndex].map((slot, slotIndex) => {
          const isFocused = anyFocused ? slot.start.getTime() === focused!.start.getTime() : dayIndex === 0 && slotIndex === 0;
          const selected = isSlotInSelection(slot, s, null);
          return {
            key: String(slotIndex),
            bag: {
              class: `scheduler-time-slot${selected ? ' selected' : ''}${greyed(slot) ? ' greyed' : ''}`,
              role: 'gridcell',
              tabindex: isFocused ? 0 : -1,
              'aria-selected': selected ? 'true' : 'false',
              'aria-label': formatCellAnnouncement(slot, options),
              'aria-colindex': week ? slotIndex + 2 : null,
              id: week ? `${id}-cell-w-${dayIndex}-${slotIndex}` : `${id}-cell-d-${slotIndex}`,
              'data-day-index': week ? dayIndex : null,
              'data-slot-index': slotIndex,
              'data-start': slot.start.toISOString(),
              'data-end': slot.end.toISOString(),
            },
          };
        }),
        events: { class: 'scheduler-events-container', role: 'gridcell' },
        boxes,
        previews,
        now:
          minutes !== null
            ? {
                bag: { class: 'scheduler-now-indicator', 'aria-hidden': 'true' },
                style: { '--scheduler-now-top': String(minutes / ((options.slotDuration ?? 1800) / 60)) },
              }
            : null,
      };
    }),
  };
}

/* ----------------------------------------------------------------------- */
/* month                                                                    */
/* ----------------------------------------------------------------------- */

export interface SchedulerMonth {
  headerRow: SchedulerBag;
  headers: { key: string; bag: SchedulerBag; text: string }[];
  grid: SchedulerBag;
  weeks: {
    key: string;
    bag: SchedulerBag;
    days: {
      key: string;
      bag: SchedulerBag;
      numberBag: SchedulerBag;
      number: string;
      events: SchedulerBag;
      items: { key: string; bag: SchedulerBag; style: SchedulerStyle; title: string }[];
      more: { bag: SchedulerBag; text: string } | null;
    }[];
  }[];
}

function monthModel(id: string, s: SchedulerState, kbdEvent: string): SchedulerMonth {
  const { options } = s;
  const weeks = dateService.getMonthWeeks(s.date, firstDayOfWeek(options));
  const viewStart = weeks[0][0];
  const viewEnd = new Date(weeks[weeks.length - 1][6]);
  viewEnd.setHours(23, 59, 59, 999);

  const eventsByDay = new Map<string, SchedulerEvent[]>();
  for (const event of timelineService.filterByRange(s.events, viewStart, viewEnd)) {
    const current = new Date(event.start);
    current.setHours(0, 0, 0, 0);
    while (current <= event.end) {
      const key = toDayKey(current);
      eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
      current.setDate(current.getDate() + 1);
    }
  }
  const max =
    typeof options.dayMaxEvents === 'number' ? options.dayMaxEvents : options.dayMaxEvents === false ? Number.POSITIVE_INFINITY : 3;

  // Roving tabindex: the focused day, else today (in the month), else the month's first day.
  const all = weeks.flat();
  const inMonth = (day: Date) => dateService.isSameMonth(day, s.date);
  const focusedKey = s.focusedDate ? toDayKey(s.focusedDate) : null;
  const rovingKey =
    (focusedKey && all.some((d) => toDayKey(d) === focusedKey) ? focusedKey : null) ??
    toDayKey(all.find((d) => dateService.isToday(d) && inMonth(d)) ?? all.find(inMonth) ?? all[0]);

  return {
    headerRow: { class: 'scheduler-day-headers', role: 'row' },
    headers: weeks[0].map((day) => ({
      key: String(day.getDay()),
      bag: { class: 'scheduler-day-header', role: 'columnheader' },
      text: dateService.getDayName(day, options.locale),
    })),
    grid: { class: 'scheduler-month-grid', role: 'presentation' },
    weeks: weeks.map((week) => ({
      key: toDayKey(week[0]),
      bag: { class: 'scheduler-month-week', role: 'row' },
      days: week.map((day) => {
        const key = toDayKey(day);
        const today = dateService.isToday(day);
        const dayEvents = eventsByDay.get(key) ?? [];
        const visible = dayEvents.slice(0, max);
        const hidden = dayEvents.length - visible.length;
        return {
          key,
          bag: {
            class: `scheduler-month-day${inMonth(day) ? '' : ' other-month'}${today ? ' today' : ''}`,
            role: 'gridcell',
            tabindex: key === rovingKey ? 0 : -1,
            id: `${id}-cell-m-${key}`,
            'data-date': key,
            'aria-current': today ? 'date' : null,
          },
          numberBag: { class: 'day-number' },
          number: String(day.getDate()),
          events: { class: 'month-events' },
          items: visible.map((event) => ({
            key: event.id,
            bag: { ...eventButton(s, event, 'scheduler-month-event', null), 'aria-describedby': kbdEvent },
            style: eventColors(s, event),
            title: event.title,
          })),
          more:
            hidden > 0
              ? {
                  bag: { class: 'scheduler-more-link', role: 'button', tabindex: 0, 'data-date': key },
                  text: schedulerMessage(options, 'moreEvents', { count: hidden }),
                }
              : null,
        };
      }),
    })),
  };
}

/* ----------------------------------------------------------------------- */
/* year                                                                     */
/* ----------------------------------------------------------------------- */

export interface SchedulerYear {
  grid: SchedulerBag;
  months: {
    key: string;
    bag: SchedulerBag;
    headerBag: SchedulerBag;
    header: string;
    mini: SchedulerBag;
    dayHeaders: { key: string; bag: SchedulerBag; text: string }[];
    days: { key: string; bag: SchedulerBag; text: string }[];
  }[];
}

export const monthKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function yearModel(id: string, s: SchedulerState): SchedulerYear {
  const { options } = s;
  const messages = resolveMessages(options.messages);
  const months = dateService.getYearMonths(s.date);
  const focusedKey = s.focusedDate ? monthKey(s.focusedDate) : null;
  const rovingKey = focusedKey && months.some((m) => monthKey(m) === focusedKey) ? focusedKey : monthKey(months[0]);
  return {
    grid: { class: 'scheduler-year-grid', role: 'row' },
    months: months.map((month) => {
      const key = monthKey(month);
      const weeks = dateService.getMonthWeeks(month, firstDayOfWeek(options));
      const monthEvents = timelineService.filterByRange(s.events, dateService.getMonthStart(month), dateService.getMonthEnd(month));
      const withEvents = new Set<string>();
      for (const event of monthEvents) {
        const current = new Date(event.start);
        current.setHours(0, 0, 0, 0);
        while (current <= event.end) {
          withEvents.add(toDayKey(current));
          current.setDate(current.getDate() + 1);
        }
      }
      const name = dateService.getMonthName(month, options.locale);
      return {
        key,
        bag: {
          class: 'scheduler-year-month',
          role: 'gridcell',
          tabindex: key === rovingKey ? 0 : -1,
          id: `${id}-cell-y-${key}`,
          'data-month': month.toISOString(),
          'aria-label': formatMessage(messages.yearMonthCardLabel, {
            month: `${name} ${month.getFullYear()}`,
            count: monthEvents.length,
            events: monthEvents.length === 1 ? messages.eventSingular : messages.eventPlural,
          }),
        },
        headerBag: { class: 'scheduler-year-month-header', role: 'button', tabindex: 0, 'data-month': month.toISOString() },
        header: name,
        mini: { class: 'scheduler-mini-month' },
        dayHeaders: weeks[0].map((day) => ({
          key: String(day.getDay()),
          bag: { class: 'scheduler-mini-day header' },
          text: dateService.getDayName(day, options.locale, 'narrow'),
        })),
        days: weeks.flat().map((day) => {
          const today = dateService.isToday(day);
          return {
            key: toDayKey(day),
            bag: {
              class: `scheduler-mini-day${dateService.isSameMonth(day, month) ? '' : ' other-month'}${today ? ' today' : ''}${
                withEvents.has(toDayKey(day)) ? ' has-events' : ''
              }`,
              'data-date': day.toISOString(),
              'aria-current': today ? 'date' : null,
            },
            text: String(day.getDate()),
          };
        }),
      };
    }),
  };
}

/* ----------------------------------------------------------------------- */
/* timeline                                                                 */
/* ----------------------------------------------------------------------- */

export interface SchedulerTimelineRow {
  key: string;
  bag: SchedulerBag;
  style: SchedulerStyle;
  cell: SchedulerBag;
  cellStyle: SchedulerStyle;
  menu: { bag: SchedulerBag; style: SchedulerStyle; glyph: SchedulerBag } | null;
  toggle: { bag: SchedulerBag; text: string } | null;
  titleBag: SchedulerBag;
  title: string;
  rename: { bag: SchedulerBag; value: string } | null;
  slots: SchedulerBag;
  cells: { key: string; bag: SchedulerBag }[];
  events: SchedulerBag | null;
  boxes: SchedulerEventBox[];
  previews: SchedulerPreviewBox[];
}

export interface SchedulerTimeline {
  timeline: SchedulerBag;
  head: SchedulerBag;
  dayRow: SchedulerBag;
  resourceHeader: SchedulerBag;
  resourceHeaderText: string;
  resizer: SchedulerBag;
  dayHeaders: SchedulerBag;
  days: { key: string; bag: SchedulerBag; style: SchedulerStyle; labelBag: SchedulerBag; label: string }[];
  timeRow: SchedulerBag;
  emptyHeader: SchedulerBag;
  timeHeaders: SchedulerBag;
  times: { key: string; bag: SchedulerBag; text: string }[];
  body: SchedulerBag;
  rows: SchedulerTimelineRow[];
  empty: { bag: SchedulerBag; text: string } | null;
  addBar: { bag: SchedulerBag; buttons: { key: string; bag: SchedulerBag; text: string }[] } | null;
}

/** The timeline row a drag or move preview belongs on. */
export function previewRowKey(s: SchedulerState): string | undefined {
  const { dragState, previewEvent } = s;
  if (!previewEvent) return undefined;
  if (previewEvent.resourceId !== undefined) return previewEvent.resourceId ?? UNASSIGNED_ROW_ID;
  const draggedId = dragState?.event?.id ?? s.keyboardMoveEventId;
  const dragged = draggedId ? s.events.find((event) => event.id === draggedId) : undefined;
  if (dragged) return dragged.resourceId ?? UNASSIGNED_ROW_ID;
  return s.selectionResourceId ?? s.focusedResourceId ?? undefined;
}

function timelineModel(id: string, s: SchedulerState, ui: SchedulerUi, kbdGrid: string, kbdEvent: string): SchedulerTimeline {
  const { options, resources, collapsedGroups } = s;
  const messages = resolveMessages(options.messages);
  const days = dateService.getWeekDays(s.date, firstDayOfWeek(options));
  const slotsByDay = days.map((day) => dateService.getTimeSlots(day, options.slotDuration, options.slotMinTime, options.slotMaxTime));
  const allSlots = slotsByDay.flat();
  const totalSlots = allSlots.length;
  const flattened = resourceService.flatten(resources, collapsedGroups);
  const hasUnassigned = (s.eventsByResource.get(null) ?? []).length > 0;
  const visible = flattened.filter((f) => f.visible);
  const viewStart = days[0];
  const viewEndTime = viewStart.getTime() + 7 * 24 * 60 * 60 * 1000;
  const viewDuration = viewEndTime - viewStart.getTime();
  const weekEnd = new Date(days[6]);
  weekEnd.setHours(23, 59, 59, 999);

  const focused = s.focusedCell;
  const rowIds = [...visible.map((f) => f.item.id as string | null), ...(hasUnassigned ? [null] : [])];
  const anyFocused =
    !!focused && rowIds.includes(s.focusedResourceId) && allSlots.some((slot) => slot.start.getTime() === focused.start.getTime());
  const dropRow = s.dragState && s.previewEvent ? previewRowKey(s) : undefined;
  const previewRow = previewRowKey(s);
  const draggedId = s.dragState?.event?.id ?? s.keyboardMoveEventId;

  const row = (item: Resource | ResourceGroup | null, depth: number, rowIndex: number, first: boolean): SchedulerTimelineRow => {
    const resourceId = item ? item.id : null;
    const key = resourceId ?? UNASSIGNED_ROW_ID;
    const title = item ? item.title : messages.unassignedResource;
    const group = !!item && isResourceGroup(item);
    const hasEvents = !item || isResource(item);
    const actions = item ? rowActions(s, item) : [];
    const swatch = item ? ((item as Resource).eventColor ?? item.color) : undefined;
    const readable = swatch ? getReadableTextColor(swatch) : null;
    const collapsed = group && collapsedGroups.has(item!.id);

    const events = hasEvents
      ? (s.eventsByResource.get(resourceId) ?? []).filter((e) => e.start < weekEnd && e.end > viewStart)
      : [];
    const laidOut = timelineService.getTimelinedParts(
      events.map((event) => ({ id: event.id, event, start: event.start, end: event.end, isStart: true, isEnd: true, dayIndex: 0, totalDays: 1 })),
    );
    const tracks = laidOut.reduce((m, p) => Math.max(m, p.totalTracks), 1);
    const horizontal = (start: number, end: number): SchedulerStyle => {
      const from = Math.max(start, viewStart.getTime());
      const to = Math.min(end, viewEndTime);
      return {
        '--scheduler-event-left': String(((from - viewStart.getTime()) / viewDuration) * totalSlots),
        '--scheduler-event-width': String(((to - from) / viewDuration) * totalSlots),
      };
    };
    const trackOf = (eventId: string | null | undefined) => laidOut.find((p) => p.part.event?.id === eventId)?.trackIndex ?? 0;

    let column = 2;
    const cells = allSlots.map((slot) => {
      const colIndex = column++;
      const isFocused = anyFocused ? slot.start.getTime() === focused!.start.getTime() && s.focusedResourceId === resourceId : first && colIndex === 2;
      const selected = isSlotInSelection(slot, s, resourceId);
      const greyed = dropRow === key && slot.start < s.previewEvent!.end && slot.end > s.previewEvent!.start;
      return {
        key: String(slot.start.getTime()),
        bag: {
          class: `scheduler-timeline-slot${selected ? ' selected' : ''}${greyed ? ' greyed' : ''}`,
          role: 'gridcell',
          'aria-colindex': colIndex,
          tabindex: isFocused ? 0 : -1,
          'aria-selected': selected ? 'true' : 'false',
          'aria-label': formatCellAnnouncement(slot, options, title),
          id: `${id}-cell-t-${key}-${slot.start.getTime()}`,
          'data-resource-id': resourceId,
          'data-unassigned': item ? null : 'true',
          'data-start': slot.start.toISOString(),
          'data-end': slot.end.toISOString(),
        },
      };
    });

    return {
      key,
      bag: {
        class: `scheduler-timeline-row${group ? ' group' : ''}${item ? '' : ' unassigned'}${dropRow === key ? ' drop-target' : ''}`,
        role: 'row',
        'aria-rowindex': rowIndex,
        'data-row-id': key,
      },
      style: { '--scheduler-timeline-tracks': String(tracks) },
      cell: { class: 'scheduler-resource-cell', role: 'rowheader', 'aria-colindex': 1 },
      cellStyle: { '--scheduler-resource-depth': String(depth) },
      menu:
        item && actions.length > 0
          ? {
              bag: {
                class: 'scheduler-row-menu-button',
                type: 'button',
                'aria-label': formatMessage(messages.rowMenuLabel, { title }),
                title: formatMessage(messages.rowMenuLabel, { title }),
                'aria-haspopup': 'dialog',
                'aria-expanded': ui.rowMenu === item.id ? 'true' : 'false',
                tabindex: -1,
                'data-action': 'row-menu',
                'data-resource-id': item.id,
              },
              style:
                swatch && readable
                  ? { '--scheduler-row-swatch': swatch, '--scheduler-row-swatch-fg': readable }
                  : {},
              glyph: { class: 'action-glyph', 'aria-hidden': 'true' },
            }
          : null,
      toggle: group
        ? {
            bag: {
              class: 'expand-toggle',
              type: 'button',
              'aria-expanded': String(!collapsed),
              'aria-label': formatMessage(messages[collapsed ? 'expandGroup' : 'collapseGroup'], { title }),
              'data-action': 'toggle-group',
              'data-group-id': item!.id,
            },
            text: collapsed ? '▶' : '▼',
          }
        : null,
      titleBag: { class: 'resource-title', title, 'data-resource-id': item && can(s, 'updateResource') ? item.id : null },
      title,
      rename:
        item && ui.renaming === item.id
          ? {
              bag: {
                class: 'form-control form-control-sm rename-input',
                type: 'text',
                'aria-label': formatMessage(messages.renameResourceLabel, { title }),
              },
              value: title,
            }
          : null,
      slots: { class: 'scheduler-timeline-slots', role: 'presentation' },
      cells,
      events: hasEvents
        ? { class: 'scheduler-timeline-events', role: 'gridcell', 'aria-colindex': 2, 'aria-colspan': column - 2 }
        : null,
      boxes: laidOut
        .filter(({ part }) => part.event)
        .map(({ part, trackIndex }): SchedulerEventBox => {
          const event = part.event;
          return {
            key: event.id,
            bag: { ...eventButton(s, event, 'scheduler-timeline-event', title), 'aria-describedby': kbdEvent },
            style: {
              ...eventColors(s, event),
              ...horizontal(event.start.getTime(), event.end.getTime()),
              '--scheduler-event-track': String(trackIndex),
            },
            content: { class: 'event-content' },
            titleBag: { class: 'event-title' },
            title: event.title,
            timeBag: null,
            time: '',
            handles: resizeHandles(
              s,
              { ...part, isStart: event.start.getTime() >= viewStart.getTime(), isEnd: event.end.getTime() <= viewEndTime },
              ['left', 'right'],
            ),
          };
        }),
      previews:
        hasEvents && s.previewEvent && previewRow === key
          ? [
              {
                key: 'preview',
                bag: { class: 'scheduler-timeline-event preview' },
                style: {
                  ...horizontal(s.previewEvent.start.getTime(), s.previewEvent.end.getTime()),
                  '--scheduler-event-track': String(trackOf(draggedId)),
                },
              },
            ]
          : [],
    };
  };

  let column = 2;
  const rowCount = visible.length + 2 + (hasUnassigned ? 1 : 0);
  const rows = [
    ...visible.map((flat, i) => row(flat.item, flat.depth, i + 3, i === 0)),
    ...(hasUnassigned ? [row(null, 0, visible.length + 3, visible.length === 0)] : []),
  ];
  const canResource = can(s, 'createResource');
  const canGroup = can(s, 'createGroup');

  return {
    timeline: {
      class: 'scheduler-timeline',
      role: 'grid',
      'aria-label': formatMessage(messages.timelineGridLabel, { date: dateService.formatDateWithWeekday(days[0], options.locale) }),
      'aria-rowcount': rowCount,
      'aria-colcount': 1 + totalSlots,
      'aria-describedby': kbdGrid,
      'aria-multiselectable': 'true',
    },
    head: { class: 'scheduler-timeline-head' },
    dayRow: { class: 'scheduler-timeline-header', role: 'row', 'aria-rowindex': 1 },
    resourceHeader: { class: 'scheduler-resource-header', role: 'columnheader', 'aria-colindex': 1 },
    resourceHeaderText: messages.resourcesHeader,
    resizer: {
      class: 'scheduler-column-resizer',
      role: 'separator',
      tabindex: 0,
      'aria-orientation': 'vertical',
      'aria-label': messages.resizeResourceColumn,
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': ui.column?.percent ?? null,
    },
    dayHeaders: { class: 'scheduler-timeline-slots-header', role: 'presentation' },
    days: days.map((day, i) => {
      const colIndex = column;
      column += slotsByDay[i].length;
      return {
        key: toDayKey(day),
        bag: {
          class: 'scheduler-timeline-slot-header day',
          role: 'columnheader',
          'aria-colindex': colIndex,
          'aria-colspan': slotsByDay[i].length,
        },
        style: { '--scheduler-day-slots': String(slotsByDay[i].length) },
        labelBag: { class: 'day-label' },
        label: dateService.formatDateWithWeekday(day, options.locale),
      };
    }),
    timeRow: { class: 'scheduler-timeline-header', role: 'row', 'aria-rowindex': 2 },
    emptyHeader: { class: 'scheduler-resource-header', role: 'columnheader', 'aria-colindex': 1 },
    timeHeaders: { class: 'scheduler-timeline-slots-header', role: 'presentation' },
    times: allSlots.map((slot, i) => ({
      key: String(slot.start.getTime()),
      bag: { class: 'scheduler-timeline-slot-header', role: 'columnheader', 'aria-colindex': i + 2 },
      text: dateService.formatTime(slot.start, options.timeFormat, options.locale),
    })),
    body: { class: 'scheduler-timeline-body' },
    rows,
    empty: flattened.length === 0 && !hasUnassigned ? { bag: { class: 'scheduler-timeline-empty' }, text: messages.noResources } : null,
    addBar:
      canResource || canGroup
        ? {
            bag: { class: 'scheduler-timeline-addbar', role: 'toolbar', 'aria-label': messages.addResourceBarLabel },
            buttons: [
              ...(canResource
                ? [{ key: 'resource', bag: { class: 'scheduler-add-button', type: 'button', 'data-action': 'add-resource' }, text: messages.addResource }]
                : []),
              ...(canGroup
                ? [{ key: 'group', bag: { class: 'scheduler-add-button', type: 'button', 'data-action': 'add-group' }, text: messages.addGroup }]
                : []),
            ],
          }
        : null,
  };
}

/* ----------------------------------------------------------------------- */
/* popups                                                                   */
/* ----------------------------------------------------------------------- */

export interface SchedulerPopoverEvent {
  key: string;
  row: SchedulerBag;
  bag: SchedulerBag;
  swatch: SchedulerBag;
  swatchStyle: SchedulerStyle;
  titleBag: SchedulerBag;
  title: string;
  remove: SchedulerBag | null;
}

export interface SchedulerDayPopover {
  bag: SchedulerBag;
  head: SchedulerBag;
  dateBag: SchedulerBag;
  date: string;
  countBag: SchedulerBag;
  count: string;
  close: SchedulerBag;
  empty: { bag: SchedulerBag; text: string } | null;
  list: SchedulerBag | null;
  events: SchedulerPopoverEvent[];
  groups: { key: string; bag: SchedulerBag; headingBag: SchedulerBag; heading: string; list: SchedulerBag; events: SchedulerPopoverEvent[] }[];
  resource: {
    bag: SchedulerBag;
    labelBag: SchedulerBag;
    label: string;
    select: SchedulerBag;
    options: { key: string; value: string; text: string }[];
  } | null;
  actions: SchedulerBag;
  create: { bag: SchedulerBag; text: string } | null;
  drill: { bag: SchedulerBag; text: string };
}

/** Every event on `day`, ordered by start. */
export function eventsOnDay(s: SchedulerState, day: Date): SchedulerEvent[] {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return s.events.filter((e) => e.start < end && e.end > start).sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Every event overlapping the month of `day`, ordered by start. */
export function eventsInMonth(s: SchedulerState, day: Date): SchedulerEvent[] {
  const start = new Date(day.getFullYear(), day.getMonth(), 1);
  const end = new Date(day.getFullYear(), day.getMonth() + 1, 1);
  return s.events.filter((e) => e.start < end && e.end > start).sort((a, b) => a.start.getTime() - b.start.getTime());
}

function popoverEvent(s: SchedulerState, event: SchedulerEvent): SchedulerPopoverEvent {
  return {
    key: event.id,
    row: { class: 'popover-event-row' },
    bag: { class: 'popover-event', type: 'button', 'aria-label': formatEventAriaLabel(event, null, s.options), 'data-event-id': event.id },
    swatch: { class: 'popover-event-swatch', 'aria-hidden': 'true' },
    swatchStyle: { '--scheduler-event-bg': resolveEventColor(event, s.resourceById, s.options.defaultEventColor) },
    titleBag: { class: 'popover-event-title' },
    title: event.title,
    remove: can(s, 'deleteEvent', event)
      ? {
          class: 'popover-event-delete',
          type: 'button',
          'aria-label': schedulerMessage(s.options, 'deleteEventLabel', { title: event.title }),
          'data-event-id': event.id,
        }
      : null,
  };
}

function dayPopoverModel(s: SchedulerState, popover: NonNullable<SchedulerUi['popover']>): SchedulerDayPopover {
  const { options } = s;
  const { date: day, scope } = popover;
  const events = scope === 'month' ? eventsInMonth(s, day) : eventsOnDay(s, day);
  const dateText = scope === 'month' ? `${dateService.getMonthName(day, options.locale)} ${day.getFullYear()}` : dateService.formatDateWithWeekday(day, options.locale);
  const resources = [...s.resourceById.values()];
  const monthStart = new Date(day.getFullYear(), day.getMonth(), 1);
  const groups = [
    ...events
      .reduce((map, event) => {
        const groupDay = event.start < monthStart ? new Date(monthStart) : new Date(event.start);
        groupDay.setHours(0, 0, 0, 0);
        const bucket = map.get(groupDay.getTime()) ?? { day: groupDay, events: [] as SchedulerEvent[] };
        bucket.events.push(event);
        return map.set(groupDay.getTime(), bucket);
      }, new Map<number, { day: Date; events: SchedulerEvent[] }>())
      .values(),
  ];
  const canCreate = can(s, 'createEvent');
  return {
    bag: {
      class: 'scheduler-day-popover',
      role: 'dialog',
      popover: 'auto',
      'aria-label': schedulerMessage(options, 'dayPopoverLabel', { date: dateText }),
    },
    head: { class: 'popover-head' },
    dateBag: { class: 'popover-date' },
    date: dateText,
    countBag: { class: 'popover-count' },
    count: schedulerMessage(options, 'dayPopoverCount', {
      count: events.length,
      events: schedulerMessage(options, events.length === 1 ? 'eventSingular' : 'eventPlural'),
    }),
    close: { class: 'popover-close', type: 'button', 'aria-label': schedulerMessage(options, 'closePopover') },
    empty: events.length === 0 ? { bag: { class: 'popover-empty' }, text: schedulerMessage(options, 'dayPopoverEmpty') } : null,
    list: events.length > 0 && scope === 'day' ? { class: 'popover-events' } : null,
    events: scope === 'day' ? events.map((event) => popoverEvent(s, event)) : [],
    groups:
      scope === 'month'
        ? groups.map((group) => ({
            key: String(group.day.getTime()),
            bag: { class: 'popover-day-group' },
            headingBag: { class: 'popover-day-label' },
            heading: dateService.formatDateWithWeekday(group.day, options.locale),
            list: { class: 'popover-events' },
            events: group.events.map((event) => popoverEvent(s, event)),
          }))
        : [],
    resource:
      canCreate && resources.length > 0
        ? {
            bag: { class: 'popover-resource' },
            labelBag: { class: 'popover-resource-label' },
            label: schedulerMessage(options, 'newEventResource'),
            select: { class: 'form-select popover-resource-select', 'aria-label': schedulerMessage(options, 'newEventResource') },
            options: [
              { key: '', value: '', text: schedulerMessage(options, 'unassignedResource') },
              ...resources.map((r) => ({ key: r.id, value: r.id, text: r.title })),
            ],
          }
        : null,
    actions: { class: 'popover-actions' },
    create: canCreate ? { bag: { class: 'popover-action primary', type: 'button', 'data-popover-action': 'create' }, text: schedulerMessage(options, 'newEvent') } : null,
    drill: {
      bag: { class: 'popover-action', type: 'button', 'data-popover-action': 'drill' },
      text: schedulerMessage(options, scope === 'month' ? 'showMonth' : 'showDay'),
    },
  };
}

export interface SchedulerRowPanel {
  bag: SchedulerBag;
  actions: {
    key: string;
    color: { label: SchedulerBag; text: string; input: SchedulerBag; value: string } | null;
    button: { bag: SchedulerBag; text: string } | null;
  }[];
}

function rowPanelModel(s: SchedulerState, resourceId: string): SchedulerRowPanel | null {
  const item = findResourceOrGroup(s.resources, resourceId);
  if (!item || s.view !== 'timeline') return null;
  const actions = rowActions(s, item);
  if (actions.length === 0) return null;
  const messages = resolveMessages(s.options.messages);
  const resource = item as Resource;
  const colorField = resource.eventColor ? 'eventColor' : 'color';
  const current = resource.eventColor ?? item.color;
  return {
    bag: {
      class: 'scheduler-row-panel',
      role: 'dialog',
      popover: 'auto',
      'aria-label': formatMessage(messages.rowMenuDialogLabel, { title: item.title }),
    },
    actions: actions.map((action) => {
      if (action === 'set-resource-color') {
        const text = formatMessage(messages.resourceColor, { title: item.title });
        return {
          key: action,
          color: {
            label: { class: 'row-action row-action-color' },
            text,
            input: {
              type: 'color',
              class: 'row-color-input',
              'aria-label': text,
              'data-action': 'set-resource-color',
              'data-resource-id': item.id,
              'data-field': colorField,
            },
            value: current && /^#[0-9a-f]{6}$/i.test(current) ? current : '#000000',
          },
          button: null,
        };
      }
      const adds = action === 'add-resource' || action === 'add-group';
      const text =
        action === 'rename-resource'
          ? formatMessage(messages.renameResource, { title: item.title })
          : action === 'add-resource'
            ? formatMessage(messages.addResourceToGroup, { title: item.title })
            : action === 'add-group'
              ? formatMessage(messages.addGroupToGroup, { title: item.title })
              : formatMessage(messages.removeResource, { title: item.title });
      return {
        key: action,
        color: null,
        button: {
          bag: {
            type: 'button',
            class: `row-action${action === 'delete-resource' ? ' is-destructive' : ''}`,
            'data-action': action,
            'data-parent-id': adds ? item.id : null,
            'data-resource-id': adds ? null : item.id,
          },
          text,
        },
      };
    }),
  };
}

export interface SchedulerEditor {
  bag: SchedulerBag;
  head: SchedulerBag;
  titleBag: SchedulerBag;
  title: string;
  close: SchedulerBag;
  field: SchedulerBag;
  titleLabel: string;
  titleInput: SchedulerBag;
  titleValue: string;
  titleError: SchedulerBag;
  titleErrorText: string;
  startLabel: string;
  endLabel: string;
  start: ModelBinding<Date | null>;
  end: ModelBinding<Date | null>;
  startMax: Date | null;
  endMin: Date | null;
  startDisabled: boolean;
  endDisabled: boolean;
  endInvalid: boolean;
  endError: string | null;
  locale: string | null;
  firstDayOfWeek: FirstDayOfWeek;
  hour12: boolean;
  step: TimeStep;
  startField: SchedulerBag;
  endField: SchedulerBag;
  colorLabel: string;
  colorInput: SchedulerBag;
  colorValue: string;
  inherit: SchedulerBag;
  inheritInput: SchedulerBag;
  inheritChecked: boolean;
  inheritLabel: string;
  actions: SchedulerBag;
  save: { bag: SchedulerBag; text: string };
  remove: { bag: SchedulerBag; text: string } | null;
  cancel: { bag: SchedulerBag; text: string };
}

/**
 * The editor's minute step, from the grid's own `slotDuration` so the two
 * agree: picking a time the grid cannot represent would be its own small lie.
 * Clamped to the steps the picker supports.
 */
export function pickerStep(options: SchedulerOptions): 1 | 5 | 10 | 15 | 30 | 60 {
  const minutes = Math.round((options.slotDuration ?? 1800) / 60);
  const supported = [1, 5, 10, 15, 30, 60] as const;
  return supported.find((step) => step >= minutes) ?? 60;
}

/** A 12-hour clock in the editor: an unset `timeFormat` follows the locale, never false. */
export const resolvedHour12 = (options: SchedulerOptions): boolean =>
  (options.timeFormat ?? dateService.detectTimeFormat(options.locale)) === '12h';

/** Which of the editor's time fields the permission table allows. */
export function editorTimeFields(s: SchedulerState, event: SchedulerEvent): { canStart: boolean; canEnd: boolean; startIsMove: boolean } {
  const permissions = s.resolvedPermissions;
  const canMove = can(s, 'moveEvent', event);
  const canResize = resolveResizeEdge('start', { permissions, event }) && resolveResizeEdge('end', { permissions, event });
  return { canStart: canMove || canResize, canEnd: canResize, startIsMove: canMove };
}

function editorModel(id: string, s: SchedulerState, editor: NonNullable<SchedulerUi['editor']>, args: SchedulerViewArgs): SchedulerEditor | null {
  const event = s.events.find((e) => e.id === editor.eventId);
  if (!event) return null;
  const { draft, error } = editor;
  const { options } = s;
  const canFields = can(s, 'editEvent', event);
  const titleInvalid = error?.field === 'title';
  const endInvalid = error?.field === 'end';
  const { canStart, canEnd, startIsMove } = editorTimeFields(s, event);
  const errorId = `${id}-editor-title-error`;
  const msg = (key: keyof SchedulerMessages, params?: Record<string, string | number>) => schedulerMessage(options, key, params);
  return {
    bag: { class: 'scheduler-event-editor', role: 'dialog', popover: 'auto', 'aria-label': msg('eventEditorLabel', { title: event.title }) },
    head: { class: 'editor-head' },
    titleBag: { class: 'editor-title' },
    title: draft.title,
    close: { class: 'editor-close', type: 'button', 'aria-label': msg('closePopover') },
    field: { class: 'editor-field' },
    titleLabel: msg('editorTitleLabel'),
    titleInput: {
      type: 'text',
      class: `form-control form-control-sm editor-input editor-title-input${titleInvalid ? ' is-invalid' : ''}`,
      disabled: !canFields,
      'aria-invalid': titleInvalid ? 'true' : 'false',
      'aria-errormessage': errorId,
      'aria-describedby': errorId,
    },
    titleValue: draft.title,
    // The message node always exists, so the IDREFs above always resolve; it is shown only while invalid.
    titleError: { class: `invalid-feedback${titleInvalid ? ' d-block' : ''}`, id: errorId },
    titleErrorText: titleInvalid ? error!.message : '',
    startLabel: msg('editorStartLabel'),
    endLabel: msg('editorEndLabel'),
    start: args.editorStart,
    end: args.editorEnd,
    startMax: startIsMove ? null : draft.end,
    endMin: draft.start,
    startDisabled: !canStart,
    endDisabled: !canEnd,
    endInvalid,
    endError: endInvalid ? error!.message : null,
    locale: options.locale ?? null,
    firstDayOfWeek: firstDayOfWeek(options),
    hour12: resolvedHour12(options),
    step: pickerStep(options),
    // The draft as ISO, like a slot's data-start: the field's value without reading a picker.
    startField: { class: 'editor-field editor-start-field', 'data-value': draft.start?.toISOString() ?? null },
    endField: { class: 'editor-field editor-end-field', 'data-value': draft.end?.toISOString() ?? null },
    colorLabel: msg('editorColorLabel'),
    colorInput: {
      type: 'color',
      class: 'form-control form-control-color editor-input editor-color-input',
      disabled: !canFields || draft.inheritColor,
    },
    colorValue: draft.color ?? resolveEventColor(event, s.resourceById, options.defaultEventColor),
    inherit: { class: 'editor-field editor-inherit form-check' },
    inheritInput: { type: 'checkbox', class: 'form-check-input editor-inherit-input', disabled: !canFields },
    inheritChecked: draft.inheritColor,
    inheritLabel: msg('editorInheritColor'),
    actions: { class: 'editor-actions' },
    save: { bag: { class: 'editor-action primary', type: 'button', 'data-editor-action': 'save' }, text: msg('editorSave') },
    remove: can(s, 'deleteEvent', event)
      ? { bag: { class: 'editor-action danger', type: 'button', 'data-editor-action': 'delete' }, text: msg('editorDelete') }
      : null,
    cancel: { bag: { class: 'editor-action', type: 'button', 'data-editor-action': 'cancel' }, text: msg('editorCancel') },
  };
}

/* ----------------------------------------------------------------------- */
/* the whole view                                                           */
/* ----------------------------------------------------------------------- */

export interface SchedulerView {
  root: SchedulerBag;
  container: SchedulerBag;
  header: SchedulerBag;
  nav: SchedulerBag;
  prev: SchedulerBag;
  next: SchedulerBag;
  today: SchedulerBag;
  todayText: string;
  title: SchedulerBag;
  titleText: string;
  switcher: SchedulerBag;
  views: { key: string; bag: SchedulerBag; text: string }[];
  content: SchedulerBag;
  contentStyle: SchedulerStyle;
  timeGrid: SchedulerTimeGrid | null;
  month: SchedulerMonth | null;
  year: SchedulerYear | null;
  timeline: SchedulerTimeline | null;
  kbdGrid: SchedulerBag;
  kbdGridText: string;
  kbdEvent: SchedulerBag;
  kbdEventText: string;
  popover: SchedulerDayPopover | null;
  rowPanel: SchedulerRowPanel | null;
  editor: SchedulerEditor | null;
  live: SchedulerBag;
  announcement: string;
}

/** The header title for the current view and date. */
export function schedulerTitle(s: SchedulerState): string {
  const { date, view, options } = s;
  switch (view) {
    case 'year':
      return String(date.getFullYear());
    case 'month':
      return dateService.formatDate(date, options.locale, { month: 'long', year: 'numeric' });
    case 'day':
      return dateService.formatDate(date, options.locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    default: {
      const weekStart = dateService.getWeekStart(date, firstDayOfWeek(options));
      return dateService.formatDateRange(weekStart, dateService.addDays(weekStart, 6), options.locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
}

function gridInstructionsKey(s: SchedulerState): keyof SchedulerMessages {
  const canCreate = can(s, 'createEvent') || can(s, 'selectRange');
  if (s.view === 'year') return 'gridInstructionsYear';
  if (s.view === 'month') return canCreate ? 'gridInstructionsMonth' : 'gridInstructionsMonthReadOnly';
  return canCreate ? 'gridInstructions' : 'gridInstructionsReadOnly';
}

function gridLabel(s: SchedulerState): string {
  const { options, date } = s;
  const messages = resolveMessages(options.messages);
  switch (s.view) {
    case 'year':
      return formatMessage(messages.yearGridLabel, { date: String(date.getFullYear()) });
    case 'month':
      return formatMessage(messages.monthGridLabel, { date: dateService.formatDate(date, options.locale, { month: 'long', year: 'numeric' }) });
    case 'week':
      return formatMessage(messages.weekGridLabel, {
        date: dateService.formatDateWithWeekday(dateService.getWeekStart(date, firstDayOfWeek(options)), options.locale),
      });
    default:
      return formatMessage(messages.dayGridLabel, { date: dateService.formatDateWithWeekday(date, options.locale) });
  }
}

export function connectScheduler(args: SchedulerViewArgs): SchedulerView {
  const { id, s, ui } = args;
  const { options } = s;
  const msg = (key: keyof SchedulerMessages, params?: Record<string, string | number>) => schedulerMessage(options, key, params);
  const kbdGrid = `${id}-kbd-grid`;
  const kbdEvent = `${id}-kbd-event`;
  const timeline = s.view === 'timeline';
  const views: ViewType[] = ['year', 'month', 'week', 'day', 'timeline'];
  const editor = ui.editor ? editorModel(id, s, ui.editor, args) : null;

  return {
    root: { class: 'scheduler', id, 'data-view': s.view, ...hydratedAttr(args.hydrated) },
    container: { class: 'scheduler-container', 'data-narrow': ui.narrow ? '' : null },
    header: { class: 'scheduler-header', 'data-narrow': ui.narrow ? '' : null },
    nav: { class: 'scheduler-nav', 'aria-label': msg('navLabel') },
    prev: { type: 'button', 'aria-label': msg('previousPeriod'), title: msg('previousPeriod'), 'data-nav': 'prev' },
    next: { type: 'button', 'aria-label': msg('nextPeriod'), title: msg('nextPeriod'), 'data-nav': 'next' },
    today: { type: 'button', 'aria-label': msg('jumpToToday'), 'data-nav': 'today' },
    todayText: msg('today'),
    title: { class: 'scheduler-title', 'aria-live': 'polite', 'aria-atomic': 'true' },
    titleText: schedulerTitle(s),
    switcher: { class: 'scheduler-view-switcher', role: 'group', 'aria-label': msg('switchView') },
    views: views.map((view) => ({
      key: view,
      bag: { type: 'button', class: view === s.view ? 'active' : null, 'aria-pressed': String(view === s.view), 'data-view': view },
      text: viewLabel(options, view),
    })),
    // Week/day/month/year claim the grid on the scroller; the timeline puts it on an inner element.
    content: {
      class: `scheduler-content scheduler-${s.view}-view`,
      role: timeline ? null : 'grid',
      'aria-label': timeline ? null : (args.label ?? gridLabel(s)),
      'aria-describedby': timeline ? null : kbdGrid,
      'aria-multiselectable': s.view === 'week' || s.view === 'day' ? 'true' : null,
    },
    contentStyle: ui.column?.width != null
      ? { '--scheduler-resource-column-width': `min(${ui.column.width}px, calc(100% - 50px))` }
      : {},
    timeGrid: s.view === 'week' || s.view === 'day' ? timeGridModel(id, s, ui, kbdEvent) : null,
    month: s.view === 'month' ? monthModel(id, s, kbdEvent) : null,
    year: s.view === 'year' ? yearModel(id, s) : null,
    timeline: timeline ? timelineModel(id, s, ui, kbdGrid, kbdEvent) : null,
    kbdGrid: { class: 'visually-hidden', id: kbdGrid },
    kbdGridText: msg(gridInstructionsKey(s)),
    kbdEvent: { class: 'visually-hidden', id: kbdEvent },
    kbdEventText: msg(
      can(s, 'moveEvent') || can(s, 'resizeEvent') || can(s, 'deleteEvent')
        ? args.eventEditor
          ? 'eventInstructionsWithEditor'
          : 'eventInstructions'
        : 'eventInstructionsReadOnly',
    ),
    popover: ui.popover ? dayPopoverModel(s, ui.popover) : null,
    rowPanel: ui.rowMenu ? rowPanelModel(s, ui.rowMenu) : null,
    editor,
    live: { class: 'visually-hidden', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
    announcement: args.announcement,
  };
}
