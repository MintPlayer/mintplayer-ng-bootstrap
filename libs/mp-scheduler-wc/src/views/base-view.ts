import { SchedulerState } from '../state/scheduler-state';

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
