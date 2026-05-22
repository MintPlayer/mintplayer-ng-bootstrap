/**
 * Get element by data attributes (used for finding time slots)
 */
export function getElementByData(
  container: Element,
  dataAttributes: Record<string, string>
): Element | null {
  const selector = Object.entries(dataAttributes)
    .map(([key, value]) => `[data-${key}="${value}"]`)
    .join('');
  return container.querySelector(selector);
}

/**
 * Get data attributes from an element
 */
export function getDataAttributes(element: Element): Record<string, string> {
  const dataset = (element as HTMLElement).dataset;
  const result: Record<string, string> = {};
  for (const key in dataset) {
    const value = dataset[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Find closest ancestor with a data attribute
 */
export function findClosestWithData(
  element: Element,
  dataAttribute: string
): Element | null {
  return element.closest(`[data-${dataAttribute}]`);
}

/**
 * Get scroll position relative to an element
 */
export function getScrollPosition(element: Element): { top: number; left: number } {
  return {
    top: element.scrollTop,
    left: element.scrollLeft,
  };
}

/**
 * Scroll to a specific time in the scheduler
 */
export function scrollToTime(
  container: Element,
  timeElement: Element,
  behavior: ScrollBehavior = 'smooth'
): void {
  const containerRect = container.getBoundingClientRect();
  const timeRect = timeElement.getBoundingClientRect();
  const relativeTop = timeRect.top - containerRect.top + container.scrollTop;

  container.scrollTo({
    top: relativeTop,
    behavior,
  });
}

/**
 * Check if an element is in viewport
 */
export function isInViewport(element: Element, container?: Element): boolean {
  const rect = element.getBoundingClientRect();
  const containerRect = container
    ? container.getBoundingClientRect()
    : { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };

  return (
    rect.top >= containerRect.top &&
    rect.left >= containerRect.left &&
    rect.bottom <= containerRect.bottom &&
    rect.right <= containerRect.right
  );
}

/**
 * Get pointer position relative to an element
 */
export function getRelativePosition(
  event: MouseEvent | TouchEvent,
  element: Element
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

/**
 * Create a CSS variable setter for theming
 */
export function setCSSVariable(
  element: HTMLElement,
  name: string,
  value: string
): void {
  element.style.setProperty(`--${name}`, value);
}

/**
 * Get computed CSS variable value
 */
export function getCSSVariable(element: HTMLElement, name: string): string {
  return getComputedStyle(element).getPropertyValue(`--${name}`).trim();
}

/**
 * Add multiple CSS classes
 */
export function addClasses(element: Element, ...classes: string[]): void {
  element.classList.add(...classes.filter(Boolean));
}

/**
 * Remove multiple CSS classes
 */
export function removeClasses(element: Element, ...classes: string[]): void {
  element.classList.remove(...classes.filter(Boolean));
}

/**
 * Toggle CSS class based on condition
 */
export function toggleClass(element: Element, className: string, condition: boolean): void {
  element.classList.toggle(className, condition);
}
