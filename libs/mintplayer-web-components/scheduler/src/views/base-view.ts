import {
  dateService,
  formatMessage,
  getContrastColor,
  resolveCapability,
  resolveResizeEdge,
  resolveEventColor,
  resolveMessages,
  type SchedulerEvent,
  type SchedulerEventPart,
  type DayOfWeek,
  type SchedulerOptions,
  type TimeSlot,
} from '@mintplayer/web-components/scheduler-core';
import { SchedulerState } from '../state/scheduler-state';

/**
 * Build the descriptive aria-label for an event block. Used by every view.
 * Format: "{title}, {start}–{end} on {resource}". Resource is omitted when
 * the event has no resource or the caller doesn't have it (week/day views).
 * Strings and date formatting follow options.messages / options.locale.
 */
export function formatEventAriaLabel(
  event: SchedulerEvent,
  resourceTitle: string | null,
  options: SchedulerOptions,
): string {
  const timeFormat = options.timeFormat;
  const start = dateService.formatTime(event.start, timeFormat, options.locale);
  const end = dateService.formatTime(event.end, timeFormat, options.locale);
  const day = event.start.toLocaleDateString(options.locale, { weekday: 'long', month: 'short', day: 'numeric' });
  const parts = [`${event.title}, ${start}–${end}`, day];
  if (resourceTitle) {
    parts.push(formatMessage(resolveMessages(options.messages).eventOnResource, { resource: resourceTitle }));
  }
  return parts.join(', ');
}

/**
 * Normalised selection range — covers anchor.start through extent.end (or
 * the reverse if the user shift-arrowed backwards), with the resource pinned
 * at the anchor (timeline only).
 */
export function selectionRange(
  state: SchedulerState,
): { start: Date; end: Date; resourceId: string | null } | null {
  const { selectionAnchor, selectionExtent, selectionResourceId } = state;
  if (!selectionAnchor || !selectionExtent) return null;
  const startTime = Math.min(selectionAnchor.start.getTime(), selectionExtent.start.getTime());
  const endTime = Math.max(selectionAnchor.end.getTime(), selectionExtent.end.getTime());
  return {
    start: new Date(startTime),
    end: new Date(endTime),
    resourceId: selectionResourceId,
  };
}

/**
 * Whether a slot's [start, end) interval intersects the active selection range.
 * Used by every time-grid view to drive the `.selected` / aria-selected styling
 * on slot DOM. Cross-day spans (D1) light up naturally because intersection
 * holds for every slot inside the linear time-range.
 */
export function isSlotInSelection(
  slot: TimeSlot,
  state: SchedulerState,
  resourceId: string | null = null,
): boolean {
  const range = selectionRange(state);
  if (!range) return false;
  if (range.resourceId && resourceId && range.resourceId !== resourceId) return false;
  return slot.start.getTime() < range.end.getTime() && slot.end.getTime() > range.start.getTime();
}

/**
 * Live-region announcement for a focused cell. Read after each Arrow nav.
 * Includes weekday + date so screen readers don't lose the user across
 * cross-day moves.
 */
export function formatCellAnnouncement(
  slot: TimeSlot,
  options: SchedulerOptions,
  resourceTitle: string | null = null,
): string {
  const day = slot.start.toLocaleDateString(options.locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const time = dateService.formatTime(slot.start, options.timeFormat, options.locale);
  const parts = [`${day}, ${time}`];
  if (resourceTitle) parts.push(resourceTitle);
  return parts.join(', ');
}

/**
 * Live-region announcement after Shift+Arrow grows or shrinks the range.
 * Reads "Selection: {start time, day} to {end time, day}, {N} slots".
 */
export function formatSelectionAnnouncement(
  state: SchedulerState,
  slotDuration: number,
): string {
  const range = selectionRange(state);
  if (!range) return '';
  const { options } = state;
  const timeFormat = options.timeFormat;
  const dayFmt = { weekday: 'short', month: 'short', day: 'numeric' } as const;
  const startStr = `${dateService.formatTime(range.start, timeFormat, options.locale)} ${range.start.toLocaleDateString(options.locale, dayFmt)}`;
  const endStr = `${dateService.formatTime(range.end, timeFormat, options.locale)} ${range.end.toLocaleDateString(options.locale, dayFmt)}`;
  const slotMs = slotDuration * 1000;
  const slotCount = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / slotMs));
  const messages = resolveMessages(options.messages);
  return formatMessage(messages.selection, {
    start: startStr,
    end: endStr,
    count: slotCount,
    slots: slotCount === 1 ? messages.slotSingular : messages.slotPlural,
  });
}

/**
 * Live-region announcement for an in-progress keyboard event move.
 */
export function formatMoveAnnouncement(
  start: Date,
  end: Date,
  options: SchedulerOptions,
): string {
  const timeFormat = options.timeFormat;
  const day = start.toLocaleDateString(options.locale, { weekday: 'short', month: 'short', day: 'numeric' });
  return formatMessage(resolveMessages(options.messages).movedTo, {
    start: dateService.formatTime(start, timeFormat, options.locale),
    end: dateService.formatTime(end, timeFormat, options.locale),
    day,
  });
}

/**
 * Live-region announcement for an in-progress keyboard event resize. The
 * `edge` field tells the user which side they're stretching, so they can
 * tell Shift+ArrowDown (end edge) from Alt+Shift+ArrowDown (start edge).
 */
export function formatResizeAnnouncement(
  start: Date,
  end: Date,
  edge: 'start' | 'end',
  options: SchedulerOptions,
): string {
  const timeFormat = options.timeFormat;
  const messages = resolveMessages(options.messages);
  return formatMessage(messages.resizedEdge, {
    edge: edge === 'start' ? messages.startEdge : messages.endEdge,
    start: dateService.formatTime(start, timeFormat, options.locale),
    end: dateService.formatTime(end, timeFormat, options.locale),
  });
}

/** One slot row's height in px. Mirrors `--scheduler-slot-height`. */
const SLOT_HEIGHT_PX = 40;

/** Floor so a very short event stays clickable. */
const MIN_EVENT_HEIGHT_PX = 20;

/**
 * A `HH:mm[:ss]` time on the same calendar day as `ref`.
 *
 * Uses `setSeconds` off local midnight rather than `setHours(h)` so that
 * `'24:00:00'` — the `slotMaxTime` default — resolves to the NEXT day's midnight
 * (the exclusive end of the window) instead of wrapping to 00:00 of the same day.
 */
function timeOnDay(ref: Date, time: string): Date {
  const [h = 0, m = 0, s = 0] = time.split(':').map(Number);
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  d.setSeconds(h * 3600 + m * 60 + s);
  return d;
}

/**
 * Base class for scheduler views
 */
export abstract class BaseView {
  protected container: HTMLElement;
  protected state: SchedulerState;

  constructor(container: HTMLElement, state: SchedulerState) {
    this.container = container;
    this.state = state;
  }

  /**
   * The week's first day for the current options — the consumer's choice if they
   * made one, otherwise the locale's own convention (Sunday for en-US and ja-JP,
   * Monday across most of Europe).
   *
   * Resolved at the point of use rather than written back into `options`:
   * `setOptions` merges cumulatively, so a stored derivation would freeze at the
   * locale that produced it and quietly ignore a later locale change.
   */
  protected get firstDayOfWeek(): DayOfWeek {
    return dateService.resolveFirstDayOfWeek(
      this.state.options.firstDayOfWeek,
      this.state.options.locale,
    );
  }

  /**
   * Update the view with new state
   */
  abstract update(state: SchedulerState): void;

  /**
   * Render the view
   */
  abstract render(): void;

  /**
   * Clean up the view
   */
  abstract destroy(): void;

  /**
   * Update the now indicator position (called every minute)
   * Default implementation does nothing - override in views that have a now indicator
   */
  updateNowIndicator(): void {
    // Default: do nothing
  }

  /**
   * Get the view's root element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Helper to create an element with classes
   */
  /**
   * Vertical geometry for one day-part in a time-grid column, in px.
   *
   * The single source of truth for BOTH committed event boxes and drag ghosts —
   * they drifted apart before, which is how the ghost ended up measuring from a
   * different origin than the box it was previewing.
   *
   * Measures from `slotMinTime`, NOT from midnight: the column's first row is
   * the `slotMinTime` slot, so a midnight origin displaced every box by the
   * whole hidden window (with `slotMinTime: '08:00'` a 09:00 event landed ~640px
   * too low). The part is also clipped to `[slotMinTime, slotMaxTime]` on its own
   * day, so a middle part of a multi-day span renders as the full visible window
   * rather than 24h worth of pixels.
   *
   * Returns `null` when the part falls entirely outside the visible window —
   * callers skip it rather than drawing a zero-height box.
   */
  /**
   * Apply an event's fill + contrast text colour to its box.
   *
   * One place, so a resource's colour reaches EVERY view — week/day/month/year
   * previously had no route from an event to its resource, which is why
   * `Resource.color`/`eventColor` sat in the model unread.
   */
  protected applyEventColors(el: HTMLElement, event: SchedulerEvent): void {
    const background = resolveEventColor(
      event,
      this.state.resourceById,
      this.state.options.defaultEventColor,
    );
    el.style.backgroundColor = background;
    el.style.color = event.textColor ?? getContrastColor(background);
  }

  protected partGeometry(
    start: Date,
    end: Date,
    options: SchedulerOptions,
  ): { top: number; height: number } | null {
    const slotSeconds = options.slotDuration ?? 1800;
    const windowStart = timeOnDay(start, options.slotMinTime ?? '00:00:00');
    const windowEnd = timeOnDay(start, options.slotMaxTime ?? '24:00:00');

    const clippedStart = Math.max(start.getTime(), windowStart.getTime());
    const clippedEnd = Math.min(end.getTime(), windowEnd.getTime());
    if (clippedEnd <= clippedStart) return null;

    const pxPerMs = SLOT_HEIGHT_PX / (slotSeconds * 1000);
    return {
      top: (clippedStart - windowStart.getTime()) * pxPerMs,
      height: Math.max((clippedEnd - clippedStart) * pxPerMs, MIN_EVENT_HEIGHT_PX),
    };
  }

  protected createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    ...classes: string[]
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (classes.length > 0) {
      el.classList.add(...classes);
    }
    return el;
  }

  /**
   * Helper to set data attributes
   */
  protected setData(
    element: HTMLElement,
    data: Record<string, string | number>
  ): void {
    for (const [key, value] of Object.entries(data)) {
      element.dataset[key] = String(value);
    }
  }

  /**
   * Helper to clear container
   */
  protected clearContainer(): void {
    this.container.innerHTML = '';
    // The container's ARIA is per-view too: week/day/month/year claim `role=grid`
    // on it via `applyGridRoles`, the timeline puts its grid on an inner element
    // instead. Leaving the role behind after a view switch made the timeline a
    // grid-inside-a-grid — an axe `aria-required-children` CRITICAL that only
    // appears once a user has switched views, which is why the page-load audit
    // never caught it.
    for (const attr of [
      'role',
      'aria-label',
      'aria-describedby',
      'aria-multiselectable',
      'aria-rowcount',
    ]) {
      this.container.removeAttribute(attr);
    }
    // Each view's render() adds its own `scheduler-<view>-view` class here. Without
    // removing the previous one they accumulate forever, so the classes are NOT
    // mutually exclusive and can't be used to scope CSS. Drop them all.
    this.container.classList.remove(
      'scheduler-week-view',
      'scheduler-day-view',
      'scheduler-month-view',
      'scheduler-year-view',
      'scheduler-timeline-view',
    );
  }

  /**
   * Append the start/end resize handles for an event part. The handle strip
   * is the pointer hit zone the drag machine targets via
   * closest('.resize-handle'); the glyph inside it is a purely decorative
   * affordance revealed by the .selected class — never focusable, the
   * keyboard resize path lives on the event element (move-mode).
   * Position classes are per-view: ['top','bottom'] for time grids,
   * ['left','right'] for the timeline.
   */
  protected appendResizeHandles(
    eventEl: HTMLElement,
    part: SchedulerEventPart,
    [startClass, endClass]: [string, string] = ['top', 'bottom'],
  ): void {
    // Per-edge, so `resizable: { start: false, end: true }` — declared on the
    // model but previously only checked as a boolean — now actually works, and a
    // read-only scheduler advertises no grab handle at all.
    const permissions = this.state.resolvedPermissions;
    if (part.isStart && resolveResizeEdge('start', { permissions, event: part.event })) {
      eventEl.appendChild(this.createResizeHandle(startClass, 'start'));
    }
    if (part.isEnd && resolveResizeEdge('end', { permissions, event: part.event })) {
      eventEl.appendChild(this.createResizeHandle(endClass, 'end'));
    }
  }

  private createResizeHandle(positionClass: string, edge: 'start' | 'end'): HTMLElement {
    const handle = this.createElement('div', 'resize-handle', positionClass);
    this.setData(handle, { handle: edge });
    const glyph = this.createElement('span', 'resize-glyph');
    glyph.setAttribute('aria-hidden', 'true');
    handle.appendChild(glyph);
    return handle;
  }

  /**
   * Retrofit the ARIA grid chain onto a rendered view (wc-aria PRD step 5.7):
   * the container claims `grid`, layout-only wrappers become `presentation`
   * so they stop breaking the chain, the header strip becomes the
   * column-header row, and the cell groups named by `rows` become rows. The
   * cells themselves already carry role="gridcell" + ids + roving tabindex.
   *
   * The mapping is pragmatic, not ideal: week/day DOM is COLUMN-major (a row
   * here is one day's column of time cells), because the layout was built
   * for CSS first. The cells' focus announcements carry full day+time, so
   * navigation stays understandable.
   */
  protected applyGridRoles(config: {
    columnHeaderRow?: string;
    columnHeaders?: string;
    presentation?: string[];
    rows?: string;
    /** Extra gridcells (e.g. a per-row events overlay whose buttons need a
     *  cell to live in — rows may not own buttons directly). */
    cells?: string;
    /** Grids where Shift+Arrow extends a multi-cell range (week/day). */
    multiselectable?: boolean;
    /**
     * Accessible name for the grid. REQUIRED in practice: without it a screen
     * reader announces "grid" over hundreds of unnamed cells with no indication
     * of what it is, and two schedulers on a page are indistinguishable.
     * A consumer's own `aria-label` on the host wins — the host has no role, so
     * that attribute reaches nothing on its own.
     */
    label?: string;
  }): void {
    const container = this.container;
    if (container.getAttribute('role') !== 'grid') container.setAttribute('role', 'grid');
    const hostLabel = (this.container.getRootNode() as ShadowRoot).host?.getAttribute(
      'aria-label',
    );
    const label = hostLabel || config.label;
    if (label) container.setAttribute('aria-label', label);
    // Keymap discoverability (FR-9): the hidden instructions div rendered by
    // mp-scheduler shares this shadow root, so the IDREF resolves.
    container.setAttribute('aria-describedby', 'scheduler-kbd-grid');
    if (config.multiselectable) container.setAttribute('aria-multiselectable', 'true');
    const apply = (selector: string, role: string) =>
      container.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (!el.hasAttribute('role')) el.setAttribute('role', role);
      });
    if (config.columnHeaderRow) apply(config.columnHeaderRow, 'row');
    if (config.columnHeaders) apply(config.columnHeaders, 'columnheader');
    (config.presentation ?? []).forEach((selector) => apply(selector, 'presentation'));
    if (config.rows) apply(config.rows, 'row');
    if (config.cells) apply(config.cells, 'gridcell');
  }

  /** aria-current="date" on every element the views styled `.today`. */
  protected markToday(): void {
    this.container
      .querySelectorAll<HTMLElement>('.today')
      .forEach((el) => el.setAttribute('aria-current', 'date'));
  }
}
