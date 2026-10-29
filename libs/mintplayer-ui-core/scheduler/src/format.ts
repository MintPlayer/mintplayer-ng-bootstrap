import {
  dateService,
  formatMessage,
  resolveMessages,
  type SchedulerEvent,
  type SchedulerOptions,
  type TimeSlot,
} from '@mintplayer/ui-core/scheduler-core';
import type { SchedulerState } from './state/scheduler-state';

/**
 * Build the descriptive aria-label for an event block. Used by every view.
 * Format: "{title}, {start}–{end} on {resource}". Resource is omitted when
 * the event has no resource or the caller doesn't have it (week/day views).
 * Strings and date formatting follow options.messages / options.locale.
 */
/**
 * `YYYY-MM-DD` in LOCAL components — the wire format `parseDayKey` round-trips
 * without a timezone shift. Deliberately not `toISOString()`, which is UTC and
 * names the wrong day either side of midnight for most of the world.
 */
export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

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

/**
 * A `HH:mm[:ss]` time on the same calendar day as `ref`.
 *
 * Uses `setSeconds` off local midnight rather than `setHours(h)` so that
 * `'24:00:00'` — the `slotMaxTime` default — resolves to the NEXT day's midnight
 * (the exclusive end of the window) instead of wrapping to 00:00 of the same day.
 */
export function timeOnDay(ref: Date, time: string): Date {
  const [h = 0, m = 0, s = 0] = time.split(':').map(Number);
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  d.setSeconds(h * 3600 + m * 60 + s);
  return d;
}

/**
 * Vertical geometry for one day-part in a time-grid column, in SLOTS: the sheet
 * multiplies by `--scheduler-slot-height` (and floors the height so a very
 * short event stays clickable), so no front measures anything.
 *
 * The single source of truth for BOTH committed event boxes and drag ghosts.
 * Measures from `slotMinTime`, NOT from midnight: the column's first row is the
 * `slotMinTime` slot. The part is clipped to `[slotMinTime, slotMaxTime]` on its
 * own day, so a middle part of a multi-day span renders as the full visible
 * window. Null when the part falls entirely outside the visible window.
 */
export function partGeometry(
  start: Date,
  end: Date,
  options: SchedulerOptions,
): { top: number; height: number } | null {
  const slotMs = (options.slotDuration ?? 1800) * 1000;
  const windowStart = timeOnDay(start, options.slotMinTime ?? '00:00:00');
  const windowEnd = timeOnDay(start, options.slotMaxTime ?? '24:00:00');
  const clippedStart = Math.max(start.getTime(), windowStart.getTime());
  const clippedEnd = Math.min(end.getTime(), windowEnd.getTime());
  if (clippedEnd <= clippedStart) return null;
  return {
    top: (clippedStart - windowStart.getTime()) / slotMs,
    height: (clippedEnd - clippedStart) / slotMs,
  };
}
