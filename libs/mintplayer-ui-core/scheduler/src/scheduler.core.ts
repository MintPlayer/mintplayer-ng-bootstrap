import { Announcer } from '@mintplayer/ui-core/announce';
import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { placePopover, trackPopovers } from '@mintplayer/ui-core/overlay';
import {
  dateService,
  isResource,
  resolveCapability,
  resolveResizeEdge,
  resourceService,
  type DayOfWeek,
  type EventDetail,
  type Resource,
  type ResourceGroup,
  type SchedulerCapability,
  type SchedulerEvent,
  type SchedulerMessages,
  type SchedulerOptions,
  type SchedulerPermissions,
  type TimeRange,
  type TimeSlot,
  type ViewType,
} from '@mintplayer/ui-core/scheduler-core';
import { DragManager, type DragCompletionResult, type PointerTarget } from './drag';
import {
  formatCellAnnouncement,
  formatMoveAnnouncement,
  formatResizeAnnouncement,
  formatSelectionAnnouncement,
  selectionRange,
  timeOnDay,
  toDayKey,
} from './format';
import { InputHandler, type NormalizedPointerEvent } from './input';
import {
  SCHEDULER_UI_IDLE,
  connectScheduler,
  editorTimeFields,
  eventsOnDay,
  findResourceOrGroup,
  firstDayOfWeek,
  monthKey,
  schedulerMessage,
  viewLabel,
  type SchedulerEditorDraft,
  type SchedulerUi,
  type SchedulerView,
} from './scheduler';
import { SchedulerStateManager, createInitialState, type SchedulerState } from './state/scheduler-state';
import { clampColumnWidth, columnWidthPercent, edgeScrollVector } from './utils/geometry';

/**
 * The scheduler's core (PRD #437 D10). `scheduler.ts` turns a state snapshot
 * into attribute bags; this file owns the behaviour: the state manager, pointer
 * gestures (drag to create, move and resize, with edge auto-scroll), the
 * keyboard grid model and keyboard move mode, the three popover panels (day
 * popover, row actions, event editor), inline rename, the resource column
 * resizer and the narrow header.
 *
 * Every user action is a REQUEST (`eventCreate`, `eventUpdate`, `eventDelete`,
 * `resource*`): the consumer owns the data. Moves and resizes are also applied
 * to the scheduler's own copy so the grid does not snap back while the
 * consumer's update is in flight.
 */

/** Output payloads, named: the generated fronts import each by name. */
export type SchedulerEventSelectedDetail = EventDetail<'event-selected'>;
export type SchedulerEventDblClickDetail = EventDetail<'event-dblclick'>;
export type SchedulerEventCreateDetail = EventDetail<'event-create'>;
export type SchedulerEventUpdateDetail = EventDetail<'event-update'>;
export type SchedulerEventDeleteDetail = EventDetail<'event-delete'>;
export type SchedulerDateClickDetail = EventDetail<'date-click'>;
export type SchedulerSelectionChangeDetail = EventDetail<'selection-change'>;
export type SchedulerResourceCreateDetail = EventDetail<'resource-create'>;
export type SchedulerGroupCreateDetail = EventDetail<'group-create'>;
export type SchedulerResourceUpdateDetail = EventDetail<'resource-update'>;
export type SchedulerResourceDeleteDetail = EventDetail<'resource-delete'>;

export interface SchedulerInputs {
  events: SchedulerEvent[];
  resources: (Resource | ResourceGroup)[];
  options: Partial<SchedulerOptions> | null;
  /** Read-only: every capability off, whatever `options.permissions` says. */
  readonly: boolean;
  /** The built-in event editor (double-click, right-click, F2). */
  eventEditor: boolean;
  locale: string | null;
  /** 0–7; 7 is Sunday, as `Intl` reports it. */
  firstDayOfWeek: number | null;
  /** Seconds. */
  slotDuration: number | null;
  timeFormat: '12h' | '24h' | null;
  view: ViewType | null;
  date: Date | null;
  selectedEvent: SchedulerEvent | null;
  /** The keyboard/drag range selection. Writing null clears it. */
  selectedRange: TimeRange | null;
}

export interface SchedulerCoreState {
  s: SchedulerState;
  view: ViewType | null;
  date: Date | null;
  selectedEvent: SchedulerEvent | null;
  selectedRange: TimeRange | null;
  ui: SchedulerUi;
  announcement: string;
}

export interface SchedulerEvents {
  eventSelected: SchedulerEventSelectedDetail;
  eventDblClick: SchedulerEventDblClickDetail;
  eventCreate: SchedulerEventCreateDetail;
  eventUpdate: SchedulerEventUpdateDetail;
  eventDelete: SchedulerEventDeleteDetail;
  dateClick: SchedulerDateClickDetail;
  selectionChanged: SchedulerSelectionChangeDetail;
  resourceCreate: SchedulerResourceCreateDetail;
  groupCreate: SchedulerGroupCreateDetail;
  resourceUpdate: SchedulerResourceUpdateDetail;
  resourceDelete: SchedulerResourceDeleteDetail;
  viewChange: ViewType;
  dateChange: Date;
  selectedEventChange: SchedulerEvent | null;
  selectedRangeChange: TimeRange | null;
}

export interface SchedulerMethods {
  next(): void;
  prev(): void;
  today(): void;
  gotoDate(date: Date): void;
  changeView(view: ViewType): void;
  clearSelection(): void;
  addEvent(event: SchedulerEvent): void;
  updateEvent(event: SchedulerEvent): void;
  removeEvent(eventId: string): void;
  getEventById(eventId: string): SchedulerEvent | null;
  refetchEvents(): void;
}

type Api = CoreApi<SchedulerInputs, SchedulerCoreState, SchedulerEvents>;
type PanelKey = 'popover' | 'rowMenu' | 'editor';

const VIEWS: readonly ViewType[] = ['year', 'month', 'week', 'day', 'timeline'];
const PANEL_SELECTOR: Record<PanelKey, string> = {
  popover: '.scheduler-day-popover',
  rowMenu: '.scheduler-row-panel',
  editor: '.scheduler-event-editor',
};
const EVENT_BOX = ['.scheduler-event', '.scheduler-timeline-event', '.scheduler-month-event'];
/** Header width below which the header stacks (`data-narrow`). */
const NARROW_WIDTH = 560;
/** Two activations of one event within this window are a double click or tap. */
const DBLCLICK_WINDOW_MS = 500;
const MIN_COLUMN_PX = 80;
const MIN_GRID_PX = 50;
/** A row-menu trigger click this soon after its panel was light-dismissed is that dismissal's own click. */
const REOPEN_GUARD_MS = 300;
/** Edge auto-scroll: the band at the grid's edge that scrolls, and the fastest step per frame. */
const EDGE_ZONE_PX = 40;
const EDGE_MAX_STEP_PX = 18;

/* ----------------------------------------------------------------------- */
/* inputs → state manager                                                   */
/* ----------------------------------------------------------------------- */

/** `options` with the attribute-shaped inputs folded in; those win. */
function mergedOptions(inputs: Readonly<SchedulerInputs>): Partial<SchedulerOptions> {
  const options: Partial<SchedulerOptions> = { ...(inputs.options ?? {}) };
  if (inputs.locale) options.locale = inputs.locale;
  const day = inputs.firstDayOfWeek;
  if (day !== null && Number.isInteger(day) && day >= 0 && day <= 7) options.firstDayOfWeek = (day % 7) as DayOfWeek;
  if (inputs.slotDuration) options.slotDuration = inputs.slotDuration;
  // Seconds per slot drives every grid loop: below a minute the grid is tens of
  // thousands of cells, and zero or a negative step never terminates. Ignore it.
  const slot = options.slotDuration;
  if (slot !== undefined && !(Number.isInteger(slot) && slot >= 60 && slot <= 86400)) delete options.slotDuration;
  if (inputs.timeFormat === '12h' || inputs.timeFormat === '24h') options.timeFormat = inputs.timeFormat;
  return options;
}

/** `readonly` outranks everything, then `options.permissions`; unspecified capabilities keep their defaults. */
function effectivePermissions(readonly: boolean, options: SchedulerOptions): boolean | Partial<SchedulerPermissions> {
  if (readonly) return false;
  const explicit = options.permissions;
  if (explicit === false) return false;
  return typeof explicit === 'object' && explicit !== null ? explicit : {};
}

function applyOptions(manager: SchedulerStateManager, inputs: Readonly<SchedulerInputs>): void {
  const options = createInitialState(mergedOptions(inputs)).options;
  manager.setState({ options, resolvedPermissions: effectivePermissions(inputs.readonly, options) });
}

function seedManager(inputs: Readonly<SchedulerInputs>): SchedulerStateManager {
  const manager = new SchedulerStateManager(mergedOptions(inputs));
  applyOptions(manager, inputs);
  manager.setResources(inputs.resources ?? []);
  manager.setEvents(inputs.events ?? []);
  if (inputs.view) manager.setView(inputs.view);
  if (inputs.date) manager.setDate(new Date(inputs.date));
  if (inputs.selectedEvent) manager.setSelectedEvent(inputs.selectedEvent);
  return manager;
}

const rangeOf = (s: SchedulerState): TimeRange | null => {
  const range = selectionRange(s);
  return range ? { start: range.start, end: range.end } : null;
};
const rangeKeyOf = (s: SchedulerState): string | null => {
  const range = selectionRange(s);
  return range ? `${range.start.getTime()}-${range.end.getTime()}-${s.selectionResourceId ?? ''}` : null;
};

/** `YYYY-MM-DD` as a LOCAL date: `new Date('2026-07-31')` is UTC midnight, the previous day west of UTC. */
function parseDayKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
}

const cssEscape = (value: string): string =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);

const eventSelector = (id: string): string =>
  EVENT_BOX.map((box) => `${box}[data-event-id="${cssEscape(id)}"]:not(.preview)`).join(', ');

/* ----------------------------------------------------------------------- */
/* the engine                                                               */
/* ----------------------------------------------------------------------- */

interface Engine {
  manager: SchedulerStateManager;
  adopt(prev: Readonly<SchedulerInputs>): void;
  changeView(view: ViewType): void;
  announce(text: string): void;
  editorStart(next: Date | null): void;
  editorEnd(next: Date | null): void;
}

const engines = new WeakMap<HTMLElement, Engine>();
const engineOf = (api: Api | null): Engine | undefined => (api ? engines.get(api.host) : undefined);

interface KeyboardMove {
  eventId: string;
  workingStart: Date;
  workingEnd: Date;
  workingResourceId: string | null;
}

function attachScheduler(api: Api): () => void {
  const root = api.host;
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const raf = (fn: () => void): number => (win ? win.requestAnimationFrame(fn) : 0);
  let disposed = false;

  const manager = seedManager(api.inputs());
  // Keep what the server (and the first client render) showed: the seed's
  // `new Date()` fallback is a few milliseconds younger than the first one.
  manager.setState({ view: api.state().s.view, date: api.state().s.date });
  const state = () => manager.getState();
  const options = () => state().options;
  const msg = (key: keyof SchedulerMessages, params?: Record<string, string | number>) => schedulerMessage(options(), key, params);

  const announcer = new Announcer();
  const unsubscribeAnnouncer = announcer.subscribe((a) => api.setState({ announcement: a.text }));
  const announce = (text: string) => announcer.announce(text);
  const announceDenied = () => announce(msg('actionNotAllowed'));

  const ui = () => api.state().ui;
  const setUi = (patch: Partial<SchedulerUi>) => api.setState({ ui: { ...ui(), ...patch } });

  /* ----- permissions ----- */

  const can = (capability: SchedulerCapability, event?: SchedulerEvent | null) =>
    resolveCapability(capability, { permissions: state().resolvedPermissions, event: event ?? null });
  const canResizeEdge = (edge: 'start' | 'end', event?: SchedulerEvent | null) =>
    resolveResizeEdge(edge, { permissions: state().resolvedPermissions, event: event ?? null });
  const allowsCreateAt = (range: TimeRange, resourceId?: string) => {
    const { permissions } = options();
    if (typeof permissions !== 'object' || permissions === null) return true;
    return permissions.canCreateAt?.(range, resourceId) ?? true;
  };
  const canOpenEditor = (event: SchedulerEvent) =>
    can('editEvent', event) || can('moveEvent', event) || can('resizeEvent', event) || can('deleteEvent', event);
  const editorEnabled = () => api.inputs().eventEditor !== false && options().eventEditor !== false;
  const getEventById = (id: string) => state().events.find((e) => e.id === id) ?? null;
  const minutesPerSlot = () => Math.max(1, Math.round((options().slotDuration ?? 1800) / 60));
  const slotMs = () => (options().slotDuration ?? 1800) * 1000;

  /* ----- DOM lookups ----- */

  const q = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const content = () => q('.scheduler-content');
  const active = (): HTMLElement | null => {
    const el = doc.activeElement as HTMLElement | null;
    return el && root.contains(el) ? el : null;
  };
  /** Run `act` until it reports success, once per frame: the fronts render after the state change. */
  const retry = (act: () => boolean, frames = 6) => {
    if (disposed || act() || frames <= 0) return;
    raf(() => retry(act, frames - 1));
  };
  const whenRendered = (selector: string, act: (el: HTMLElement) => void) =>
    retry(() => {
      const el = q(selector);
      if (el) act(el);
      return !!el;
    });
  const focusEventSoon = (id: string, preventScroll = true) =>
    raf(() => whenRendered(eventSelector(id), (el) => el.focus({ preventScroll })));

  /* ----- publishing state to the template ----- */

  let prevView: ViewType = state().view;
  let prevDate = state().date.getTime();
  let prevSelectedId: string | null = state().selectedEvent?.id ?? null;
  let prevRangeKey: string | null = '__init__';
  let prevLoading: boolean | null = null;
  let dragFrame = 0;
  let pendingDrag: SchedulerState | null = null;

  const publish = (s: SchedulerState) => {
    const current = api.state();
    const patch: Partial<SchedulerCoreState> = { s };
    if (current.view !== s.view) patch.view = s.view;
    if (current.date?.getTime() !== s.date.getTime()) patch.date = s.date;
    if ((current.selectedEvent?.id ?? null) !== (s.selectedEvent?.id ?? null)) patch.selectedEvent = s.selectedEvent;
    const range = rangeOf(s);
    if (current.selectedRange?.start.getTime() !== range?.start.getTime() || current.selectedRange?.end.getTime() !== range?.end.getTime()) {
      patch.selectedRange = range;
    }
    api.setState(patch);
  };

  const cancelDragFrame = () => {
    if (dragFrame) win?.cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    pendingDrag = null;
  };

  const detectAndEmit = (s: SchedulerState) => {
    if (s.isLoading !== prevLoading) {
      if (prevLoading !== null) announce(msg(s.isLoading ? 'loadingEvents' : 'eventsLoaded'));
      prevLoading = s.isLoading;
    }
    if (s.view !== prevView) api.emit('viewChange', s.view);
    if (s.date.getTime() !== prevDate) api.emit('dateChange', s.date);
    const selectedId = s.selectedEvent?.id ?? null;
    const rangeKey = rangeKeyOf(s);
    if (selectedId !== prevSelectedId) api.emit('selectedEventChange', s.selectedEvent);
    if (rangeKey !== prevRangeKey && prevRangeKey !== '__init__') api.emit('selectedRangeChange', rangeOf(s));
    if (selectedId !== prevSelectedId || rangeKey !== prevRangeKey) {
      api.emit('selectionChanged', {
        selectedEvent: s.selectedEvent,
        range: rangeOf(s),
        view: s.view,
        resourceId: s.selectionResourceId ?? undefined,
      });
    }
    const viewSwitched = s.view !== prevView;
    prevView = s.view;
    prevDate = s.date.getTime();
    prevSelectedId = selectedId;
    prevRangeKey = rangeKey;
    if (viewSwitched) onViewSwitched();
  };

  const unsubscribeManager = manager.subscribe((s) => {
    detectAndEmit(s);
    // A drag repaints at most once a frame; anything else publishes now, and
    // drops a queued drag frame that would repaint a finished drag over it.
    if (s.dragState || s.previewEvent) {
      pendingDrag = s;
      if (!dragFrame) {
        dragFrame = raf(() => {
          dragFrame = 0;
          const next = pendingDrag;
          pendingDrag = null;
          if (next) publish(next);
        });
      }
      return;
    }
    cancelDragFrame();
    publish(s);
  });

  /** A view switch starts at the top-left and keeps a keyboard user inside the grid. */
  const onViewSwitched = () => {
    const hadFocus = !!active() && !!content()?.contains(active());
    raf(() => {
      const scroller = content();
      if (scroller) {
        scroller.scrollLeft = 0;
        scroller.scrollTop = 0;
      }
      if (hadFocus && !active()) focusFocusedCell();
    });
  };

  /* ----- cells ----- */

  const timeCellElement = (start: Date, resourceId: string | null): HTMLElement | null => {
    const iso = start.toISOString();
    if (state().view !== 'timeline') return q(`.scheduler-time-slot[data-start="${iso}"]`);
    return resourceId
      ? q(`.scheduler-timeline-slot[data-resource-id="${cssEscape(resourceId)}"][data-start="${iso}"]`)
      : q(`.scheduler-timeline-slot[data-unassigned][data-start="${iso}"]`);
  };

  const scrollAndFocus = (el: HTMLElement) => {
    el.focus({ preventScroll: true });
    if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const scrollAndFocusCell = (cell: TimeSlot, resourceId: string | null) =>
    retry(() => {
      const el = timeCellElement(cell.start, resourceId);
      if (el) scrollAndFocus(el);
      return !!el;
    });

  /**
   * Put focus back inside the grid. `focusedCell` is null until the user enters
   * the grid, and after a view switch it can name a cell the new view does not
   * render, so the fallback is the view's roving tab stop.
   */
  const focusFocusedCell = () =>
    retry(() => {
      const { focusedCell, focusedResourceId } = state();
      const target =
        (focusedCell ? timeCellElement(focusedCell.start, focusedResourceId) : null) ??
        content()?.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]') ??
        null;
      if (target) target.focus({ preventScroll: true });
      return !!target;
    });

  const dateCellId = (date: Date) =>
    state().view === 'year' ? `${root.id}-cell-y-${monthKey(date)}` : `${root.id}-cell-m-${toDayKey(date)}`;

  const scrollAndFocusDateCell = (date: Date) =>
    retry(() => {
      const el = doc.getElementById(dateCellId(date));
      if (el && root.contains(el)) scrollAndFocus(el);
      return !!el;
    });

  const navigableRows = (s: SchedulerState, includeGroups: boolean): (string | null)[] => {
    const rows: (string | null)[] = resourceService
      .flatten(s.resources, s.collapsedGroups)
      .filter((f) => f.visible && (includeGroups || isResource(f.item)))
      .map((f) => f.item.id);
    if ((s.eventsByResource.get(null) ?? []).length > 0) rows.push(null);
    return rows;
  };

  /** A string is a resource row, `null` the unassigned row, `undefined` no move. */
  const adjacentRow = (currentId: string | null, direction: 1 | -1, includeGroups: boolean): string | null | undefined => {
    const rows = navigableRows(state(), includeGroups);
    if (rows.length === 0) return undefined;
    const index = rows.indexOf(currentId);
    if (index < 0) return rows[0];
    const next = index + direction;
    return next < 0 || next >= rows.length ? undefined : rows[next];
  };

  const resourceTitle = (id: string | null): string | null => {
    if (!id) return null;
    const s = state();
    return resourceService.flatten(s.resources, s.collapsedGroups).find((f) => f.item.id === id)?.item.title ?? null;
  };

  const cellIsWithinView = (start: Date): boolean => {
    const s = state();
    const min = options().slotMinTime ?? '00:00:00';
    const max = options().slotMaxTime ?? '24:00:00';
    if (s.view === 'day') return start >= timeOnDay(s.date, min) && start < timeOnDay(s.date, max);
    if (s.view === 'week' || s.view === 'timeline') {
      const days = dateService.getWeekDays(s.date, firstDayOfWeek(options()));
      return start >= timeOnDay(days[0], min) && start < timeOnDay(days[6], max);
    }
    return false;
  };

  const commitFocusMove = (cell: TimeSlot, resourceId: string | null, extend: boolean) => {
    if (extend) {
      manager.extendSelection(cell, resourceId);
      manager.setFocusedCell(cell, resourceId, false);
      announce(formatSelectionAnnouncement(state(), options().slotDuration ?? 1800));
    } else {
      manager.setFocusedCell(cell, resourceId, true);
      announce(formatCellAnnouncement(cell, options(), resourceTitle(resourceId)));
    }
    scrollAndFocusCell(cell, resourceId);
  };

  const moveCellByTime = (direction: 1 | -1, extend: boolean) => {
    const f = state().focusedCell;
    if (!f) return;
    const start = new Date(f.start.getTime() + direction * slotMs());
    if (!cellIsWithinView(start)) return;
    commitFocusMove({ start, end: new Date(start.getTime() + slotMs()) }, state().focusedResourceId, extend);
  };

  const moveCellByDay = (direction: 1 | -1, extend: boolean) => {
    const f = state().focusedCell;
    if (!f || state().view !== 'week') return;
    const start = new Date(f.start);
    start.setDate(start.getDate() + direction);
    if (!cellIsWithinView(start)) return;
    commitFocusMove({ start, end: new Date(start.getTime() + slotMs()) }, null, extend);
  };

  /** Resources are categorical, so Shift does not extend across rows. */
  const moveCellByResource = (direction: 1 | -1, extend: boolean) => {
    const f = state().focusedCell;
    if (!f || state().view !== 'timeline' || extend) return;
    const next = adjacentRow(state().focusedResourceId, direction, true);
    if (next !== undefined) commitFocusMove(f, next, false);
  };

  const daySlots = (day: Date) => dateService.getTimeSlots(day, options().slotDuration, options().slotMinTime, options().slotMaxTime);

  const moveCellToColumnExtreme = (end: 'start' | 'end', extend: boolean) => {
    const f = state().focusedCell;
    if (!f) return;
    const day = new Date(f.start);
    day.setHours(0, 0, 0, 0);
    const slots = daySlots(day);
    const target = end === 'start' ? slots[0] : slots[slots.length - 1];
    if (target) commitFocusMove(target, state().focusedResourceId, extend);
  };

  const moveCellToViewExtreme = (end: 'start' | 'end', extend: boolean) => {
    const s = state();
    let resourceId = s.focusedResourceId;
    let day: Date;
    if (s.view === 'day') {
      day = s.date;
    } else {
      if (s.view === 'timeline') {
        const rows = navigableRows(s, true);
        if (rows.length === 0) return;
        resourceId = end === 'start' ? rows[0] : rows[rows.length - 1];
      }
      const days = dateService.getWeekDays(s.date, firstDayOfWeek(options()));
      day = end === 'start' ? days[0] : days[6];
    }
    const slots = daySlots(day);
    const target = end === 'start' ? slots[0] : slots[slots.length - 1];
    if (target) commitFocusMove(target, resourceId, extend);
  };

  /** Page Up/Down: one period, keeping the day of the week and the time of day. */
  const moveCellByPeriod = (direction: 1 | -1) => {
    const before = state();
    const f = before.focusedCell;
    if (direction > 0) manager.next();
    else manager.prev();
    if (!f) return;
    const after = state();
    let start: Date;
    if (after.view === 'day') {
      start = new Date(after.date);
    } else {
      const oldDays = dateService.getWeekDays(before.date, firstDayOfWeek(options()));
      const newDays = dateService.getWeekDays(after.date, firstDayOfWeek(options()));
      const index = oldDays.findIndex((d) => dateService.isSameDay(d, f.start));
      start = new Date(newDays[Math.max(0, index)] ?? newDays[0]);
    }
    start.setHours(f.start.getHours(), f.start.getMinutes(), f.start.getSeconds(), 0);
    commitFocusMove({ start, end: new Date(start.getTime() + slotMs()) }, before.focusedResourceId, false);
  };

  /** Seed `focusedCell` from the focused slot when the user tabbed onto the fallback stop. */
  const initFocusedCellFromActive = () => {
    const el = active();
    const start = el?.dataset['start'];
    const end = el?.dataset['end'];
    if (!el || !start || !end) return;
    manager.setFocusedCell({ start: new Date(start), end: new Date(end) }, el.dataset['resourceId'] ?? null, true);
  };

  const syncFocusedDateFromActive = () => {
    const el = active();
    const key = el?.dataset['date'] ?? el?.dataset['month'];
    if (key) manager.setFocusedDate(parseDayKey(key));
  };

  /** Moving the focused day or month across the shown period advances the period with it. */
  const commitFocusedDate = (next: Date) => {
    const s = state();
    const crosses =
      s.view === 'month'
        ? next.getFullYear() !== s.date.getFullYear() || next.getMonth() !== s.date.getMonth()
        : s.view === 'year' && next.getFullYear() !== s.date.getFullYear();
    if (crosses) manager.setDate(new Date(next));
    manager.setFocusedDate(next);
    scrollAndFocusDateCell(next);
  };

  const moveFocusedDate = (days: number, months: number) => {
    const s = state();
    const next = new Date(s.focusedDate ?? s.date);
    if (days) next.setDate(next.getDate() + days);
    if (months) next.setMonth(next.getMonth() + months);
    commitFocusedDate(next);
  };

  const wholeDay = (day: Date): TimeRange => {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  };

  /* ----- creating ----- */

  const emitCreate = (range: TimeRange, originalEvent: Event, resourceId?: string): boolean => {
    if (!can('createEvent') || !allowsCreateAt(range, resourceId)) {
      announceDenied();
      return false;
    }
    api.emit('eventCreate', { range, view: state().view, resourceId, originalEvent });
    return true;
  };

  const createFromCellOrSelection = (originalEvent: Event) => {
    const s = state();
    const range = selectionRange(s);
    const target = range
      ? { start: range.start, end: range.end, resourceId: s.selectionResourceId ?? undefined }
      : s.focusedCell
        ? { start: s.focusedCell.start, end: s.focusedCell.end, resourceId: s.focusedResourceId ?? undefined }
        : null;
    if (!target) return;
    if (!emitCreate({ start: target.start, end: target.end }, originalEvent, target.resourceId)) return;
    announce(
      msg('selectionCommitted', {
        start: dateService.formatTime(target.start, options().timeFormat, options().locale),
        end: dateService.formatTime(target.end, options().timeFormat, options().locale),
      }),
    );
  };

  /* ----- navigation ----- */

  const changeView = (view: ViewType) => {
    manager.setView(view);
    announce(msg('viewChanged', { view: viewLabel(options(), view) }));
  };

  /** Drilling destroys the control it was activated from, so focus goes to the new view's grid. */
  const drillTo = (date: Date, view: ViewType) => {
    manager.setDate(date);
    manager.setView(view);
    raf(() => focusFocusedCell());
  };

  const handleMoreLink = (dateKey: string) => {
    const day = parseDayKey(dateKey);
    const behavior = options().moreLinkBehavior ?? 'popover';
    if (typeof behavior === 'function') behavior({ date: day, events: eventsOnDay(state(), day) });
    else if (behavior === 'popover') openPopover(day);
    else drillTo(day, 'day');
  };

  /* ----- panels (all three are `popover="auto"`) ----- */

  const panelKeyOf = (panel: HTMLElement): PanelKey | null =>
    (Object.keys(PANEL_SELECTOR) as PanelKey[]).find((key) => panel.matches(PANEL_SELECTOR[key])) ?? null;

  const rowTrigger = (id: string | null) =>
    id ? q(`.scheduler-row-menu-button[data-resource-id="${cssEscape(id)}"]`) : null;

  const anchorOf = (key: PanelKey): HTMLElement | null => {
    const current = ui();
    if (key === 'popover') {
      const id = current.popover?.anchorId;
      const el = id ? doc.getElementById(id) : null;
      return el && root.contains(el) ? el : null;
    }
    if (key === 'rowMenu') return rowTrigger(current.rowMenu);
    return current.editor ? q(eventSelector(current.editor.eventId)) : null;
  };

  const showPanel = (key: PanelKey, initialFocus: (panel: HTMLElement) => HTMLElement | null) =>
    whenRendered(PANEL_SELECTOR[key], (panel) => {
      if (typeof panel.showPopover === 'function' && !panel.matches(':popover-open')) panel.showPopover();
      const anchor = anchorOf(key);
      if (anchor) placePopover(panel, anchor);
      initialFocus(panel)?.focus();
    });

  /** Close a panel; focus returns to its anchor when it was inside the panel. */
  const closePanel = (key: PanelKey, returnFocus = true) => {
    if (!ui()[key]) return;
    const panel = q(PANEL_SELECTOR[key]);
    const focusInside = !!panel && panel.contains(doc.activeElement);
    const anchor = anchorOf(key);
    if (panel && typeof panel.hidePopover === 'function' && panel.matches(':popover-open')) panel.hidePopover();
    setUi({ [key]: null });
    if (returnFocus && focusInside) anchor?.focus();
  };

  let lastDismiss: { id: string; at: number } | null = null;

  /** A light dismiss (outside click, Escape) mirrored into state, or the panel would render again. */
  const onToggle = (e: Event) => {
    const panel = e.target as HTMLElement;
    if ((e as ToggleEvent).newState !== 'closed' || !(panel instanceof HTMLElement)) return;
    const key = panelKeyOf(panel);
    if (!key || !ui()[key]) return;
    const focused = doc.activeElement;
    const focusLost = !focused || focused === doc.body || panel.contains(focused);
    const anchor = anchorOf(key);
    if (key === 'rowMenu' && ui().rowMenu) lastDismiss = { id: ui().rowMenu!, at: Date.now() };
    setUi({ [key]: null });
    if (focusLost) anchor?.focus();
  };

  const openPopover = (day: Date, anchorId?: string, scope: 'day' | 'month' = 'day') => {
    setUi({ popover: { date: new Date(day), scope, anchorId: anchorId ?? dateCellId(day) } });
    showPanel('popover', (panel) => panel.querySelector('.popover-event') ?? panel.querySelector('.popover-action'));
  };

  const openRowMenu = (resourceId: string) => {
    if (ui().rowMenu === resourceId) {
      closePanel('rowMenu');
      return;
    }
    if (lastDismiss?.id === resourceId && Date.now() - lastDismiss.at < REOPEN_GUARD_MS) {
      lastDismiss = null;
      return;
    }
    if (ui().rowMenu) closePanel('rowMenu', false);
    setUi({ rowMenu: resourceId });
    showPanel('rowMenu', (panel) => panel.querySelector('.row-action'));
  };

  const openEditor = (event: SchedulerEvent) => {
    if (!editorEnabled() || !canOpenEditor(event)) return;
    const draft: SchedulerEditorDraft = {
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      color: event.color ?? null,
      inheritColor: !event.color,
    };
    setUi({ editor: { eventId: event.id, draft, error: null } });
    showPanel(
      'editor',
      (panel) => panel.querySelector('input:not([disabled])') ?? panel.querySelector('.editor-action'),
    );
  };

  /* ----- day popover ----- */

  const selectFromPopover = (event: SchedulerEvent, originalEvent: Event) => {
    closePanel('popover', false);
    manager.setSelectedEvent(event);
    api.emit('eventSelected', { event, originalEvent });
  };

  const createFromPopover = (originalEvent: Event) => {
    const day = ui().popover?.date;
    if (!day) return;
    // Read before closing: closing removes the panel. Empty is the unassigned row.
    const resourceId = q<HTMLSelectElement>('select.popover-resource-select')?.value || undefined;
    closePanel('popover');
    emitCreate(wholeDay(day), originalEvent, resourceId);
  };

  const drillFromPopover = () => {
    const popover = ui().popover;
    if (!popover) return;
    closePanel('popover', false);
    drillTo(new Date(popover.date), popover.scope === 'month' ? 'month' : 'day');
  };

  /**
   * The popover stays open: `eventDelete` is a request, and whether the row goes
   * is the consumer's call. Focus moves to the row at the same index, since the
   * deleted row's button is about to vanish.
   */
  const deleteFromPopover = (event: SchedulerEvent) => {
    if (!can('deleteEvent', event)) {
      announceDenied();
      return;
    }
    const panel = q(PANEL_SELECTOR.popover);
    const rows = panel ? [...panel.querySelectorAll<HTMLElement>('.popover-event')] : [];
    const index = rows.findIndex((row) => row.dataset['eventId'] === event.id);
    api.emit('eventDelete', { event });
    raf(() =>
      retry(() => {
        const now = q(PANEL_SELECTOR.popover);
        if (!now) return true;
        const remaining = [...now.querySelectorAll<HTMLElement>('.popover-event')];
        if (remaining.some((row) => row.dataset['eventId'] === event.id)) return false;
        const target =
          remaining[Math.min(Math.max(index, 0), remaining.length - 1)] ??
          now.querySelector<HTMLElement>('.popover-action') ??
          now.querySelector<HTMLElement>('.popover-close');
        target?.focus();
        return true;
      }),
    );
  };

  /* ----- event editor ----- */

  const updateDraft = (patch: Partial<SchedulerEditorDraft>) => {
    const editor = ui().editor;
    if (!editor) return;
    const error = editor.error && (editor.error.field === 'title' ? 'title' in patch : 'end' in patch) ? null : editor.error;
    setUi({ editor: { ...editor, draft: { ...editor.draft, ...patch }, error } });
  };

  const formatTime = (d: Date) => dateService.formatTime(d, options().timeFormat, options().locale);

  /** A start change is a move where moving is allowed, otherwise a start resize clamped to one slot. */
  const editorStart = (next: Date | null) => {
    const editor = ui().editor;
    if (!next || !editor) return;
    const { draft } = editor;
    const delta = next.getTime() - draft.start.getTime();
    if (delta === 0) return;
    const event = getEventById(editor.eventId);
    if (!event || editorTimeFields(state(), event).startIsMove) {
      updateDraft({ start: next, end: new Date(draft.end.getTime() + delta) });
      return;
    }
    const latest = new Date(draft.end.getTime() - slotMs());
    if (next.getTime() <= latest.getTime()) {
      updateDraft({ start: next });
      return;
    }
    updateDraft({ start: latest });
    announce(msg('editorStartClamped', { start: formatTime(latest) }));
  };

  const editorEnd = (next: Date | null) => {
    const editor = ui().editor;
    if (!next || !editor) return;
    const earliest = new Date(editor.draft.start.getTime() + slotMs());
    if (next.getTime() >= earliest.getTime()) {
      updateDraft({ end: next });
      return;
    }
    updateDraft({ end: earliest });
    announce(msg('editorEndClamped', { end: formatTime(earliest) }));
  };

  /** The message is spoken by moving focus to the control that describes itself with it. */
  const refuseSave = (field: 'title' | 'end', message: string) => {
    const editor = ui().editor;
    if (!editor) return;
    setUi({ editor: { ...editor, error: { field, message } } });
    raf(() =>
      whenRendered(field === 'title' ? '.editor-title-input' : '.editor-end-field .datetime-picker-input', (el) => {
        if (ui().editor?.error?.field === field) el.focus();
      }),
    );
  };

  const saveEditor = () => {
    const editor = ui().editor;
    const original = editor ? getEventById(editor.eventId) : null;
    if (!editor || !original) return;
    const { draft } = editor;
    const updated: SchedulerEvent = { ...original };
    if (can('editEvent', original)) {
      const title = draft.title.trim();
      if (!title) {
        refuseSave('title', msg('editorTitleRequired'));
        return;
      }
      updated.title = title;
      if (draft.inheritColor) delete updated.color;
      else if (draft.color) updated.color = draft.color;
    }
    const { canStart } = editorTimeFields(state(), original);
    if (canStart) {
      updated.start = draft.start;
      updated.end = draft.end;
    }
    if (isNaN(updated.start.getTime()) || isNaN(updated.end.getTime()) || updated.end <= updated.start) {
      refuseSave('end', msg('editorInvalidRange'));
      return;
    }
    closePanel('editor');
    manager.updateEvent(updated);
    api.emit('eventUpdate', { event: updated, oldEvent: original, originalEvent: new CustomEvent('event-editor') });
    announce(msg('eventUpdated', { title: updated.title }));
  };

  const deleteFromEditor = () => {
    const editor = ui().editor;
    const event = editor ? getEventById(editor.eventId) : null;
    if (!event) return;
    if (!can('deleteEvent', event)) {
      announceDenied();
      return;
    }
    closePanel('editor', false);
    api.emit('eventDelete', { event });
    raf(() => focusFocusedCell());
  };

  /* ----- rename ----- */

  let renameDone = true;

  const beginRename = (resourceId: string) => {
    if (!can('updateResource') || !findResourceOrGroup(state().resources, resourceId)) return;
    if (ui().rowMenu) closePanel('rowMenu', false);
    renameDone = false;
    setUi({ renaming: resourceId });
    whenRendered('.rename-input', (input) => {
      input.focus();
      (input as HTMLInputElement).select();
    });
  };

  const finishRename = (input: HTMLInputElement, commit: boolean) => {
    const resourceId = ui().renaming;
    if (renameDone || !resourceId) return;
    renameDone = true;
    const resource = findResourceOrGroup(state().resources, resourceId);
    const next = input.value.trim();
    setUi({ renaming: null });
    if (resource && commit && next && next !== resource.title) {
      api.emit('resourceUpdate', { resource, changes: { title: next }, originalEvent: new CustomEvent('rename') });
      announce(msg('resourceRenamed', { from: resource.title, to: next }));
    }
    raf(() => whenRendered(`.scheduler-timeline-slot[data-resource-id="${cssEscape(resourceId)}"]`, (cell) => cell.focus({ preventScroll: true })));
  };

  /* ----- keyboard move mode ----- */

  let keyboardMove: KeyboardMove | null = null;

  const applyMovePreview = () => {
    if (!keyboardMove) return;
    const { eventId, workingStart, workingEnd, workingResourceId } = keyboardMove;
    // `resourceId` explicitly: null IS the unassigned row.
    manager.setState({ keyboardMoveEventId: eventId, previewEvent: { start: workingStart, end: workingEnd, resourceId: workingResourceId } });
    raf(() => {
      q(eventSelector(eventId))?.focus({ preventScroll: true });
      const cell = timeCellElement(workingStart, workingResourceId);
      if (cell && typeof cell.scrollIntoView === 'function') cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  };

  const enterMoveMode = (event: SchedulerEvent) => {
    if (!can('moveEvent', event) && !can('resizeEvent', event)) {
      announceDenied();
      return;
    }
    keyboardMove = {
      eventId: event.id,
      workingStart: new Date(event.start),
      workingEnd: new Date(event.end),
      workingResourceId: event.resourceId ?? null,
    };
    applyMovePreview();
    // On the timeline Up/Down changes the row, so the time-only keymap line would be wrong.
    announce(msg(state().view === 'timeline' ? 'moveModeEnteredTimeline' : 'moveModeEntered', { title: event.title, minutes: minutesPerSlot() }));
  };

  const nudgeMove = (deltaMs: number) => {
    if (!keyboardMove) return;
    keyboardMove.workingStart = new Date(keyboardMove.workingStart.getTime() + deltaMs);
    keyboardMove.workingEnd = new Date(keyboardMove.workingEnd.getTime() + deltaMs);
    applyMovePreview();
    announce(formatMoveAnnouncement(keyboardMove.workingStart, keyboardMove.workingEnd, options()));
  };

  /** Groups are excluded: a group row has no events container to drop into. */
  const nudgeMoveResource = (direction: 1 | -1) => {
    if (!keyboardMove) return;
    const next = adjacentRow(keyboardMove.workingResourceId, direction, false);
    if (next === undefined) return;
    keyboardMove.workingResourceId = next;
    applyMovePreview();
    announce(msg('movedToResource', { resource: next === null ? msg('unassignedResource') : (resourceTitle(next) ?? next) }));
  };

  /** Never shorter than one slot, never inverted. */
  const resizeMoveEdge = (edge: 'start' | 'end', deltaMs: number) => {
    if (!keyboardMove) return;
    if (!canResizeEdge(edge, getEventById(keyboardMove.eventId))) {
      announceDenied();
      return;
    }
    const start = edge === 'start' ? new Date(keyboardMove.workingStart.getTime() + deltaMs) : keyboardMove.workingStart;
    const end = edge === 'end' ? new Date(keyboardMove.workingEnd.getTime() + deltaMs) : keyboardMove.workingEnd;
    if (end.getTime() - start.getTime() < slotMs()) return;
    keyboardMove.workingStart = start;
    keyboardMove.workingEnd = end;
    applyMovePreview();
    announce(formatResizeAnnouncement(start, end, edge, options()));
  };

  const endMoveMode = (commit: boolean) => {
    if (!keyboardMove) return;
    const move = keyboardMove;
    keyboardMove = null;
    const original = getEventById(move.eventId);
    if (commit && original) {
      const updated: SchedulerEvent = { ...original, start: move.workingStart, end: move.workingEnd };
      if (move.workingResourceId === null) delete updated.resourceId;
      else updated.resourceId = move.workingResourceId;
      manager.setState({ keyboardMoveEventId: null, previewEvent: null });
      manager.updateEvent(updated);
      api.emit('eventUpdate', { event: updated, oldEvent: original, originalEvent: new CustomEvent('keyboard-move') });
      announce(msg('moveCommitted'));
    } else {
      manager.setState({ keyboardMoveEventId: null, previewEvent: null });
      if (!commit) announce(msg('moveCancelled'));
    }
    focusEventSoon(move.eventId, false);
  };

  const onMoveKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      endMoveMode(e.key === 'Enter');
      return;
    }
    const view = state().view;
    const timeline = view === 'timeline';
    const slot = slotMs();
    const day = 24 * 60 * 60 * 1000;
    const { shiftKey: shift, altKey: alt } = e;
    /** Shift resizes the end edge, Alt+Shift the start edge, a bare arrow moves. */
    const step = (delta: number) => {
      if (shift && alt) resizeMoveEdge('start', delta);
      else if (shift) resizeMoveEdge('end', delta);
      else nudgeMove(delta);
    };
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? -1 : 1;
        if (!timeline) step(direction * slot);
        else if (!shift && !alt) nudgeMoveResource(direction);
        return;
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        e.preventDefault();
        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        if (timeline) step(direction * slot);
        else if (view === 'week') step(direction * day);
        return;
      }
    }
  };

  /* ----- selection and activation ----- */

  let lastActivation: { eventId: string; time: number } | null = null;

  /**
   * Two activations of one event within the window are a double click. The
   * native dblclick cannot be trusted: the first click's re-render can replace
   * the node, which resets the browser's tracking; this also covers a double tap.
   */
  const registerActivation = (event: SchedulerEvent, originalEvent: Event) => {
    const now = Date.now();
    const prev = lastActivation;
    lastActivation = { eventId: event.id, time: now };
    if (prev && prev.eventId === event.id && now - prev.time < DBLCLICK_WINDOW_MS) {
      lastActivation = null;
      api.emit('eventDblClick', { event, originalEvent });
      openEditor(event);
    }
  };

  /* ----- pointer gestures ----- */

  const dragManager = new DragManager(manager);
  dragManager.setSlotResolver((x, y) => {
    const slot = doc
      .elementsFromPoint?.(x, y)
      .find((el): el is HTMLElement => root.contains(el) && el.matches('.scheduler-time-slot, .scheduler-timeline-slot'));
    const start = slot?.dataset['start'];
    const end = slot?.dataset['end'];
    if (!slot || !start || !end) return null;
    // Tri-state: a resource row names itself, the unassigned row is null, a view without rows has neither.
    const resourceId = slot.dataset['resourceId'] ?? (slot.dataset['unassigned'] ? null : undefined);
    return { start: new Date(start), end: new Date(end), ...(resourceId !== undefined ? { resourceId } : {}) };
  });

  const allowsGesture = (target: PointerTarget) => {
    switch (target.type) {
      case 'event':
        return can('moveEvent', target.event);
      case 'resize-handle':
        return canResizeEdge(target.resizeHandle === 'start' ? 'start' : 'end', target.event);
      case 'slot':
        return can('createEvent') || can('selectRange');
      default:
        return true;
    }
  };

  let edgeFrame = 0;
  let edgeVector = { x: 0, y: 0 };
  let edgePointer: NormalizedPointerEvent | null = null;

  const stopEdgeScroll = () => {
    if (edgeFrame) win?.cancelAnimationFrame(edgeFrame);
    edgeFrame = 0;
    edgeVector = { x: 0, y: 0 };
    edgePointer = null;
  };

  /** Scroll the grid while a drag holds the pointer at its edge, re-resolving the slot under it each frame. */
  const scheduleEdgeScroll = () => {
    edgeFrame = raf(() => {
      edgeFrame = 0;
      const scroller = content();
      if (!scroller || !edgePointer || !dragManager.isDragging()) return;
      const [x, y] = [scroller.scrollLeft, scroller.scrollTop];
      scroller.scrollLeft = x + edgeVector.x;
      scroller.scrollTop = y + edgeVector.y;
      if (scroller.scrollLeft === x && scroller.scrollTop === y) return;
      dragManager.handlePointerMove(edgePointer);
      scheduleEdgeScroll();
    });
  };

  const updateEdgeScroll = (pointer: NormalizedPointerEvent) => {
    const scroller = content();
    if (!scroller || !dragManager.isDragging()) {
      stopEdgeScroll();
      return;
    }
    edgeVector = edgeScrollVector({ x: pointer.clientX, y: pointer.clientY }, scroller.getBoundingClientRect(), EDGE_ZONE_PX, EDGE_MAX_STEP_PX);
    edgePointer = pointer;
    if (edgeVector.x === 0 && edgeVector.y === 0) stopEdgeScroll();
    else if (!edgeFrame) scheduleEdgeScroll();
  };

  const onDragComplete = (result: DragCompletionResult, originalEvent: Event) => {
    if (result.wasClick) {
      if (result.event) {
        manager.setSelectedEvent(result.event);
        api.emit('eventSelected', { event: result.event, originalEvent });
        registerActivation(result.event, originalEvent);
      }
      return;
    }
    if (result.type === 'create') {
      // `null` (the unassigned row) is "no resource" on the wire.
      api.emit('eventCreate', {
        range: { start: result.preview.start, end: result.preview.end },
        view: state().view,
        resourceId: result.preview.resourceId ?? undefined,
        originalEvent,
      });
      return;
    }
    if (!result.event || !result.originalEvent) return;
    const updated: SchedulerEvent = { ...result.event, start: result.preview.start, end: result.preview.end };
    // A move carries the row it ended on: a string reassigns, null unassigns, undefined keeps.
    if (result.preview.resourceId !== undefined) {
      if (result.preview.resourceId === null) delete updated.resourceId;
      else updated.resourceId = result.preview.resourceId;
    }
    manager.updateEvent(updated);
    api.emit('eventUpdate', { event: updated, oldEvent: result.originalEvent, originalEvent });
  };

  /** Every click inside a panel is the panel's: a nested picker's day cells carry `data-date` too. */
  const onPanelClick = (el: HTMLElement, originalEvent: Event): boolean => {
    const panel = el.closest<HTMLElement>(Object.values(PANEL_SELECTOR).join(', '));
    if (!panel || !root.contains(panel)) return false;
    const key = panelKeyOf(panel)!;
    if (key === 'rowMenu') {
      onResourceAction(el, originalEvent);
      return true;
    }
    if (key === 'popover') {
      const remove = el.closest<HTMLElement>('.popover-event-delete');
      const row = el.closest<HTMLElement>('.popover-event');
      const action = el.closest<HTMLElement>('[data-popover-action]')?.dataset['popoverAction'];
      if (el.closest('.popover-close')) closePanel('popover');
      else if (remove) {
        const event = getEventById(remove.dataset['eventId'] ?? '');
        if (event) deleteFromPopover(event);
      } else if (row) {
        const event = getEventById(row.dataset['eventId'] ?? '');
        if (event) selectFromPopover(event, originalEvent);
      } else if (action === 'create') createFromPopover(originalEvent);
      else if (action === 'drill') drillFromPopover();
      return true;
    }
    const action = el.closest<HTMLElement>('[data-editor-action]')?.dataset['editorAction'];
    if (el.closest('.editor-close') || action === 'cancel') closePanel('editor');
    else if (action === 'save') saveEditor();
    else if (action === 'delete') deleteFromEditor();
    return true;
  };

  /** Resource-tree buttons. Each re-checks its capability: state can change between render and click. */
  const onResourceAction = (el: HTMLElement, originalEvent: Event): boolean => {
    const button = el.closest<HTMLElement>('[data-action]');
    if (!button || !root.contains(button)) return false;
    const { action, parentId, resourceId, groupId } = button.dataset;
    const view = state().view;
    switch (action) {
      case 'row-menu':
        if (resourceId) openRowMenu(resourceId);
        return true;
      case 'toggle-group':
        if (groupId) manager.toggleGroupCollapse(groupId);
        return true;
      case 'rename-resource':
        if (resourceId) beginRename(resourceId);
        return true;
      case 'add-resource':
        if (can('createResource')) api.emit('resourceCreate', { parentId, view, originalEvent });
        return true;
      case 'add-group':
        if (can('createGroup')) api.emit('groupCreate', { parentId, view, originalEvent });
        return true;
      case 'delete-resource': {
        const resource = resourceId ? findResourceOrGroup(state().resources, resourceId) : null;
        if (resource && can('deleteResource')) api.emit('resourceDelete', { resource, originalEvent });
        return true;
      }
      // The colour input reports through `change`; a click only opens the platform picker.
      case 'set-resource-color':
        return true;
    }
    return false;
  };

  const onClick = (pointer: NormalizedPointerEvent, target: PointerTarget) => {
    const el = pointer.target;
    const originalEvent = pointer.originalEvent;
    if (onPanelClick(el, originalEvent) || onResourceAction(el, originalEvent)) return;

    const nav = el.closest<HTMLElement>('[data-nav]')?.dataset['nav'];
    if (nav) {
      if (nav === 'prev') manager.prev();
      else if (nav === 'next') manager.next();
      else manager.today();
      return;
    }
    const switcher = el.closest<HTMLElement>('.scheduler-view-switcher button[data-view]')?.dataset['view'] as ViewType | undefined;
    if (switcher && VIEWS.includes(switcher)) {
      changeView(switcher);
      return;
    }

    // Before the day click: the link sits inside a cell that also carries `data-date`.
    const more = el.closest<HTMLElement>('.scheduler-more-link')?.dataset['date'];
    if (more) {
      handleMoreLink(more);
      return;
    }

    const dayKey = el.closest<HTMLElement>('[data-date]')?.dataset['date'];
    if (dayKey) {
      const day = parseDayKey(dayKey);
      api.emit('dateClick', { date: day, originalEvent });
      // The day NUMBER always drills; the rest of the cell keeps meaning "this day".
      if (el.closest('.day-number')) {
        drillTo(day, 'day');
        return;
      }
      if (options().dayClickAction === 'popover') {
        // A year mini-day anchors on the card it sits in: an adjacent-month day's own key names another card.
        openPopover(day, el.closest<HTMLElement>('.scheduler-year-month')?.id || undefined);
        return;
      }
    }

    const month = el.closest<HTMLElement>('.scheduler-year-month-header')?.dataset['month'];
    if (month) drillTo(parseDayKey(month), 'month');

    if (target.type === 'event' && target.event) {
      manager.setSelectedEvent(target.event);
      registerActivation(target.event, originalEvent);
    }
  };

  const inputHandler = new InputHandler(
    {
      root,
      getEventById,
      isEditable: () => can('createEvent') || can('moveEvent') || can('resizeEvent'),
      isSelectable: () => can('selectRange') || can('createEvent'),
      isEventSelected: (id) => state().selectedEvent?.id === id,
    },
    {
      onPointerDown: (pointer, target, immediate) => {
        if (allowsGesture(target)) dragManager.handlePointerDown(pointer, target, immediate);
      },
      onPointerMove: (pointer) => {
        dragManager.handlePointerMove(pointer);
        updateEdgeScroll(pointer);
      },
      onPointerUp: (pointer) => {
        stopEdgeScroll();
        const result = dragManager.handlePointerUp(pointer);
        if (result) onDragComplete(result, pointer.originalEvent);
      },
      onClick,
      onDoubleClick: (pointer, target) => {
        if (target.type !== 'event' || !target.event) return;
        api.emit('eventDblClick', { event: target.event, originalEvent: pointer.originalEvent });
        openEditor(target.event);
      },
      onPointerCancel: () => {
        stopEdgeScroll();
        dragManager.cancel();
      },
      getScrollContainer: () => content(),
    },
  );
  inputHandler.attach();

  /* ----- keyboard ----- */

  const onRowTriggerKey = (e: KeyboardEvent, trigger: HTMLElement): boolean => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (trigger.dataset['resourceId']) openRowMenu(trigger.dataset['resourceId']);
        return true;
      case 'ArrowRight':
      case 'Escape':
        e.preventDefault();
        focusFocusedCell();
        return true;
    }
    return false;
  };

  const activateDrillControl = (el: HTMLElement): boolean => {
    if (el.classList.contains('scheduler-more-link') && el.dataset['date']) {
      handleMoreLink(el.dataset['date']);
      return true;
    }
    if (el.classList.contains('day-number') && el.dataset['date']) {
      drillTo(parseDayKey(el.dataset['date']), 'day');
      return true;
    }
    if (el.classList.contains('scheduler-year-month-header') && el.dataset['month']) {
      drillTo(parseDayKey(el.dataset['month']), 'month');
      return true;
    }
    return false;
  };

  const focusedKind = (el: HTMLElement | null): 'cell' | 'event' | 'other' => {
    if (!el) return 'other';
    const classes = el.classList;
    if (['scheduler-time-slot', 'scheduler-timeline-slot', 'scheduler-month-day', 'scheduler-year-month'].some((c) => classes.contains(c))) {
      return 'cell';
    }
    return EVENT_BOX.some((box) => el.matches(box)) ? 'event' : 'other';
  };

  const onMonthCellKey = (e: KeyboardEvent) => {
    syncFocusedDateFromActive();
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [-7, 0],
      ArrowDown: [7, 0],
      PageUp: [0, -1],
      PageDown: [0, 1],
    };
    if (moves[e.key]) {
      e.preventDefault();
      moveFocusedDate(...moves[e.key]);
      return;
    }
    const focused = state().focusedDate;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (focused) emitCreate(wholeDay(focused), e);
    } else if (e.key === ' ') {
      // Space, not Enter: Enter is this view's only keyboard create.
      e.preventDefault();
      if (focused) openPopover(focused);
    }
  };

  const onYearCellKey = (e: KeyboardEvent) => {
    syncFocusedDateFromActive();
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12 };
    if (moves[e.key]) {
      e.preventDefault();
      moveFocusedDate(0, moves[e.key]);
      return;
    }
    const s = state();
    if (e.key === 'Enter') {
      e.preventDefault();
      if (s.focusedDate) drillTo(new Date(s.focusedDate), 'month');
    } else if (e.key === ' ') {
      e.preventDefault();
      openPopover(s.focusedDate ?? s.date, undefined, 'month');
    }
  };

  const onCellKey = (e: KeyboardEvent) => {
    const view = state().view;
    if (view === 'month') return onMonthCellKey(e);
    if (view === 'year') return onYearCellKey(e);
    if (!state().focusedCell) initFocusedCellFromActive();
    const timeline = view === 'timeline';
    // F2 on a timeline slot renames its row; the unassigned row has no name.
    if (e.key === 'F2' && timeline) {
      const rowId = state().focusedResourceId;
      if (rowId) {
        e.preventDefault();
        beginRename(rowId);
      }
      return;
    }
    const { shiftKey: shift } = e;
    const ctrl = e.ctrlKey || e.metaKey;
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? -1 : 1;
        if (timeline) moveCellByResource(direction, shift);
        else moveCellByTime(direction, shift);
        return;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (!timeline) return moveCellByDay(-1, shift);
        // At the row's first slot ArrowLeft enters the row header: the only keyboard way to its actions.
        const before = state().focusedCell?.start.getTime();
        moveCellByTime(-1, shift);
        if (before !== undefined && before === state().focusedCell?.start.getTime() && !shift) {
          rowTrigger(state().focusedResourceId)?.focus();
        }
        return;
      }
      case 'ArrowRight':
        e.preventDefault();
        if (timeline) moveCellByTime(1, shift);
        else moveCellByDay(1, shift);
        return;
      case 'Home':
      case 'End': {
        e.preventDefault();
        const end = e.key === 'Home' ? 'start' : 'end';
        if (ctrl) moveCellToViewExtreme(end, shift);
        else moveCellToColumnExtreme(end, shift);
        return;
      }
      case 'PageUp':
      case 'PageDown':
        e.preventDefault();
        moveCellByPeriod(e.key === 'PageUp' ? -1 : 1);
        return;
      case 'Enter':
        e.preventDefault();
        createFromCellOrSelection(e);
        return;
      case 'Escape':
        e.preventDefault();
        manager.clearSelection();
        return;
    }
  };

  const focusAdjacentEvent = (current: SchedulerEvent, direction: 1 | -1) => {
    const ordered = [...state().events].sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id));
    const index = ordered.findIndex((e) => e.id === current.id);
    const target = index < 0 ? undefined : ordered[index + direction];
    if (target) q(eventSelector(target.id))?.focus();
  };

  const onEventKey = (e: KeyboardEvent) => {
    const event = state().selectedEvent;
    if (!event) return;
    switch (e.key) {
      // M is the workspace's move-mode key; Enter is kept as well.
      case 'm':
      case 'M':
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        enterMoveMode(event);
        return;
      case 'Enter':
        e.preventDefault();
        enterMoveMode(event);
        return;
      case 'F2':
        e.preventDefault();
        openEditor(event);
        return;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (can('deleteEvent', event)) api.emit('eventDelete', { event });
        else announceDenied();
        return;
      case 'Escape':
        e.preventDefault();
        focusFocusedCell();
        return;
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault();
        focusAdjacentEvent(event, e.key === 'ArrowLeft' ? -1 : 1);
        return;
    }
  };

  const onColumnKey = (e: KeyboardEvent) => {
    const width = currentColumnWidth();
    const next: Record<string, number> = { ArrowLeft: width - 16, ArrowRight: width + 16, Home: MIN_COLUMN_PX, End: Number.MAX_SAFE_INTEGER };
    if (next[e.key] === undefined) return;
    e.preventDefault();
    applyColumnWidth(next[e.key]);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (el.classList?.contains('rename-input')) {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        finishRename(el as HTMLInputElement, e.key === 'Enter');
      }
      return;
    }
    // Inside a panel the keys are the panel's. The browser closes an auto
    // popover on Escape (the topmost one: a picker's calendar before the editor
    // around it), so only an engine without the popover API needs it done here.
    const panel = el.closest?.<HTMLElement>(Object.values(PANEL_SELECTOR).join(', '));
    if (panel && root.contains(panel)) {
      if (e.key === 'Escape' && typeof panel.hidePopover !== 'function') {
        e.preventDefault();
        closePanel(panelKeyOf(panel)!);
      }
      return;
    }
    if (keyboardMove) {
      onMoveKey(e);
      return;
    }
    if (e.key === 'Escape' && dragManager.isDragging()) {
      dragManager.cancel();
      return;
    }
    if (el.classList?.contains('scheduler-column-resizer')) {
      onColumnKey(e);
      return;
    }
    const trigger = el.closest?.<HTMLElement>('.scheduler-row-menu-button');
    if (trigger && onRowTriggerKey(e, trigger)) return;
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      const shortcut: Record<string, ViewType | 'today'> = { t: 'today', y: 'year', m: 'month', w: 'week', d: 'day' };
      const target = shortcut[e.key.toLowerCase()];
      if (target) {
        e.preventDefault();
        if (target === 'today') manager.today();
        else changeView(target);
        return;
      }
    }
    if ((e.key === 'Enter' || e.key === ' ') && activateDrillControl(el)) {
      e.preventDefault();
      return;
    }
    const kind = focusedKind(active());
    if (kind === 'cell') onCellKey(e);
    else if (kind === 'event') onEventKey(e);
  };

  /* ----- other delegated events ----- */

  /** Focus landing on an event selects it, for parity with a click. */
  const onFocusIn = (e: FocusEvent) => {
    const el = e.target as HTMLElement;
    const id = el.dataset?.['eventId'];
    if (!id || focusedKind(el) !== 'event') return;
    const event = getEventById(id);
    if (!event || state().selectedEvent?.id === event.id) return;
    manager.setSelectedEvent(event);
    api.emit('eventSelected', { event, originalEvent: e });
  };

  const onFocusOut = (e: FocusEvent) => {
    const el = e.target as HTMLElement;
    if (el.classList?.contains('rename-input')) finishRename(el as HTMLInputElement, true);
  };

  const onInput = (e: Event) => {
    const el = e.target as HTMLInputElement;
    if (el.classList?.contains('editor-title-input')) updateDraft({ title: el.value });
    else if (el.classList?.contains('editor-color-input')) updateDraft({ color: el.value });
  };

  const onChange = (e: Event) => {
    const el = e.target as HTMLInputElement;
    if (el.classList?.contains('editor-inherit-input')) {
      const inherit = el.checked;
      const swatch = q<HTMLInputElement>('.editor-color-input');
      updateDraft({ inheritColor: inherit, color: inherit ? null : (swatch?.value ?? ui().editor?.draft.color ?? null) });
      return;
    }
    if (el.dataset?.['action'] !== 'set-resource-color' || !can('updateResource')) return;
    const { resourceId, field } = el.dataset;
    const resource = resourceId ? findResourceOrGroup(state().resources, resourceId) : null;
    if (!resource) return;
    api.emit('resourceUpdate', { resource, changes: field === 'eventColor' ? { eventColor: el.value } : { color: el.value }, originalEvent: e });
  };

  /**
   * Right-click opens the editor on an event, or the row's actions on a
   * resource cell. A touch long-press is the browser's synthesized contextmenu,
   * which would beat the hold-to-drag timer, so it is swallowed.
   */
  const onContextMenu = (e: Event) => {
    const el = e.target as HTMLElement;
    if (el.closest?.('input, textarea, [contenteditable]')) return;
    const pointerType = (e as PointerEvent).pointerType;
    if (pointerType ? pointerType === 'touch' : inputHandler.isTouchGesture()) {
      e.preventDefault();
      return;
    }
    const box = el.closest?.<HTMLElement>(EVENT_BOX.map((b) => `${b}[data-event-id]:not(.preview)`).join(', '));
    if (!box) {
      const id = el.closest?.('.scheduler-resource-cell')?.querySelector<HTMLElement>('.scheduler-row-menu-button')?.dataset['resourceId'];
      if (id) {
        e.preventDefault();
        openRowMenu(id);
      }
      return;
    }
    const event = getEventById(box.dataset['eventId'] ?? '');
    if (!event || !editorEnabled() || !canOpenEditor(event)) return;
    e.preventDefault();
    manager.setSelectedEvent(event);
    openEditor(event);
  };

  const onDblClick = (e: Event) => {
    const id = (e.target as HTMLElement).closest?.<HTMLElement>('.resource-title[data-resource-id]')?.dataset['resourceId'];
    if (id) beginRename(id);
  };

  /* ----- column resizer ----- */

  const currentColumnWidth = () => q('.scheduler-resource-header')?.getBoundingClientRect().width || 200;

  const applyColumnWidth = (px: number) => {
    const scrollerWidth = content()?.clientWidth ?? 0;
    const width = clampColumnWidth(px, scrollerWidth, MIN_COLUMN_PX, MIN_GRID_PX);
    setUi({ column: { width, percent: columnWidthPercent(width, scrollerWidth) } });
  };

  let columnDrag: { startX: number; startWidth: number } | null = null;
  const onColumnMove = (e: PointerEvent) => {
    if (columnDrag) applyColumnWidth(columnDrag.startWidth + (e.clientX - columnDrag.startX));
  };
  const onColumnUp = () => {
    columnDrag = null;
    doc.removeEventListener('pointermove', onColumnMove);
    doc.removeEventListener('pointerup', onColumnUp);
  };
  const onPointerDown = (e: PointerEvent) => {
    if (!(e.target as HTMLElement).classList?.contains('scheduler-column-resizer')) return;
    e.preventDefault();
    e.stopPropagation();
    columnDrag = { startX: e.clientX, startWidth: currentColumnWidth() };
    doc.addEventListener('pointermove', onColumnMove);
    doc.addEventListener('pointerup', onColumnUp);
  };

  /* ----- environment ----- */

  const nowTimer = setInterval(() => setUi({ now: Date.now() }), 60_000);
  setUi({ now: Date.now() });

  const resizeObserver =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          const width = entries[0]?.contentRect.width ?? root.clientWidth;
          const narrow = width < NARROW_WIDTH;
          if (narrow !== ui().narrow) raf(() => setUi({ narrow }));
        });
  resizeObserver?.observe(root);

  const untrackPopovers = trackPopovers(root, (panel) => {
    const key = panelKeyOf(panel);
    return key ? anchorOf(key) : null;
  });

  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('contextmenu', onContextMenu);
  root.addEventListener('dblclick', onDblClick);
  root.addEventListener('pointerdown', onPointerDown, { capture: true });
  root.addEventListener('toggle', onToggle, { capture: true });

  engines.set(root, {
    manager,
    adopt(prev) {
      const inputs = api.inputs();
      if (
        inputs.options !== prev.options ||
        inputs.readonly !== prev.readonly ||
        inputs.locale !== prev.locale ||
        inputs.firstDayOfWeek !== prev.firstDayOfWeek ||
        inputs.slotDuration !== prev.slotDuration ||
        inputs.timeFormat !== prev.timeFormat
      ) {
        applyOptions(manager, inputs);
      }
      if (inputs.resources !== prev.resources) manager.setResources(inputs.resources ?? []);
      if (inputs.events !== prev.events) manager.setEvents(inputs.events ?? []);
      if (inputs.view && inputs.view !== state().view) manager.setView(inputs.view);
      if (inputs.date && inputs.date.getTime() !== state().date.getTime()) manager.setDate(new Date(inputs.date));
      // A cleared view or date is not a command: the scheduler keeps what it shows,
      // and writes that back so the two-way model never reads null over a live grid.
      if ((!inputs.view && prev.view) || (!inputs.date && prev.date)) api.setState({ view: state().view, date: state().date });
      if (inputs.selectedEvent !== prev.selectedEvent && (inputs.selectedEvent?.id ?? null) !== (state().selectedEvent?.id ?? null)) {
        manager.setSelectedEvent(inputs.selectedEvent);
      }
      if (inputs.selectedRange !== prev.selectedRange && !inputs.selectedRange && selectionRange(state())) manager.clearSelection();
    },
    changeView,
    announce,
    editorStart,
    editorEnd,
  });

  // The seed may differ from the template's first render (an input that
  // changed before attaching); publish once so the two agree.
  publish(state());

  return () => {
    disposed = true;
    engines.delete(root);
    inputHandler.detach();
    dragManager.destroy();
    stopEdgeScroll();
    cancelDragFrame();
    onColumnUp();
    clearInterval(nowTimer);
    resizeObserver?.disconnect();
    untrackPopovers();
    root.removeEventListener('keydown', onKeyDown);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    root.removeEventListener('input', onInput);
    root.removeEventListener('change', onChange);
    root.removeEventListener('contextmenu', onContextMenu);
    root.removeEventListener('dblclick', onDblClick);
    root.removeEventListener('pointerdown', onPointerDown, { capture: true });
    root.removeEventListener('toggle', onToggle, { capture: true });
    unsubscribeManager();
    unsubscribeAnnouncer();
    announcer.destroy();
  };
}

/** Methods before attach (or on the server) act on nothing, and read the seed. */
const withManager =
  <A extends unknown[], R>(act: (engine: Engine, ...args: A) => R, fallback: R) =>
  (api: Api, ...args: A): R => {
    const engine = engineOf(api);
    return engine ? act(engine, ...args) : fallback;
  };

export const schedulerCore = defineCore<
  SchedulerInputs,
  SchedulerCoreState,
  { view: SchedulerView },
  SchedulerEvents,
  undefined,
  undefined,
  SchedulerMethods
>({
  state: (inputs) => ({
    s: seedManager(inputs).getState(),
    view: inputs.view,
    date: inputs.date,
    selectedEvent: inputs.selectedEvent,
    selectedRange: inputs.selectedRange,
    ui: SCHEDULER_UI_IDLE,
    announcement: '',
  }),
  view: ({ inputs, state, id, label, api }) => ({
    view: connectScheduler({
      id,
      label,
      s: state.s,
      ui: state.ui,
      eventEditor: inputs.eventEditor !== false && state.s.options.eventEditor !== false,
      announcement: state.announcement,
      editorStart: { value: state.ui.editor?.draft.start ?? null, set: (d) => engineOf(api())?.editorStart(d) },
      editorEnd: { value: state.ui.editor?.draft.end ?? null, set: (d) => engineOf(api())?.editorEnd(d) },
    }),
  }),
  attach: attachScheduler,
  inputsChanged: (api, prev) => engineOf(api)?.adopt(prev),
  methods: {
    next: withManager((e) => e.manager.next(), undefined),
    prev: withManager((e) => e.manager.prev(), undefined),
    today: withManager((e) => e.manager.today(), undefined),
    gotoDate: withManager((e, date: Date) => e.manager.gotoDate(date), undefined),
    changeView: withManager((e, view: ViewType) => e.changeView(view), undefined),
    clearSelection: withManager((e) => e.manager.clearSelection(), undefined),
    addEvent: withManager((e, event: SchedulerEvent) => {
      e.manager.addEvent(event);
      e.announce(schedulerMessage(e.manager.getState().options, 'eventAdded', { title: event.title }));
    }, undefined),
    updateEvent: withManager((e, event: SchedulerEvent) => {
      e.manager.updateEvent(event);
      e.announce(schedulerMessage(e.manager.getState().options, 'eventUpdated', { title: event.title }));
    }, undefined),
    removeEvent: withManager((e, eventId: string) => {
      const event = e.manager.getState().events.find((ev) => ev.id === eventId);
      e.manager.removeEvent(eventId);
      if (event) e.announce(schedulerMessage(e.manager.getState().options, 'eventRemoved', { title: event.title }));
    }, undefined),
    getEventById: (api, eventId) =>
      (engineOf(api)?.manager.getState() ?? api.state().s).events.find((e) => e.id === eventId) ?? null,
    refetchEvents: withManager((e) => e.manager.setState({}), undefined),
  },
});
