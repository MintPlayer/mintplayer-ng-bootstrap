import { dateService, type SchedulerEvent, type TimeSlot } from '@mintplayer/web-components/scheduler-core';
import { SchedulerState } from '../state/scheduler-state';

/**
 * Build the descriptive aria-label for an event block. Used by every view.
 * Format: "{title}, {start}–{end} on {resource}". Resource is omitted when
 * the event has no resource or the caller doesn't have it (week/day views).
 */
export function formatEventAriaLabel(
  event: SchedulerEvent,
  resourceTitle: string | null,
  timeFormat: '12h' | '24h' = '24h',
): string {
  const start = dateService.formatTime(event.start, timeFormat);
  const end = dateService.formatTime(event.end, timeFormat);
  const day = event.start.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const parts = [`${event.title}, ${start}–${end}`, day];
  if (resourceTitle) parts.push(`on ${resourceTitle}`);
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
  timeFormat: '12h' | '24h' = '24h',
  resourceTitle: string | null = null,
): string {
  const day = slot.start.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const time = dateService.formatTime(slot.start, timeFormat);
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
  timeFormat: '12h' | '24h' = '24h',
): string {
  const range = selectionRange(state);
  if (!range) return '';
  const startStr = `${dateService.formatTime(range.start, timeFormat)} ${range.start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
  const endStr = `${dateService.formatTime(range.end, timeFormat)} ${range.end.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
  const slotMs = slotDuration * 1000;
  const slotCount = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / slotMs));
  return `Selection: ${startStr} to ${endStr}, ${slotCount} slot${slotCount === 1 ? '' : 's'}`;
}

/**
 * Live-region announcement for an in-progress keyboard event move.
 */
export function formatMoveAnnouncement(
  start: Date,
  end: Date,
  timeFormat: '12h' | '24h' = '24h',
): string {
  const day = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `Moved to ${dateService.formatTime(start, timeFormat)}–${dateService.formatTime(end, timeFormat)}, ${day}`;
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
  timeFormat: '12h' | '24h' = '24h',
): string {
  return `Resized ${edge} edge to ${dateService.formatTime(start, timeFormat)}–${dateService.formatTime(end, timeFormat)}`;
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
  }
}
