import { dateService, type SchedulerEvent } from '@mintplayer/ng-bootstrap/web-components/scheduler-core';
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
