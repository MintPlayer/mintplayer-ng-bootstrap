import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { SortableOptions, SortDropEvent, SortAxis } from './types';

type HostElement = ReactiveControllerHost & HTMLElement;

interface BoxLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Resolve the final index a dragged item should land at, given the bounding
 * boxes of the *other* items (source excluded), in their current order. Pure and
 * geometry-only so it can be unit-tested without a DOM. Returns 0..boxes.length;
 * the value is the resting index in the array after the source is reinserted.
 *
 * For `'both'` it models reading order: an item sits *after* the pointer when the
 * pointer is on an earlier row, or on the same row but left of the item's centre.
 */
export function resolveDropIndex(
  boxes: readonly BoxLike[],
  pointerX: number,
  pointerY: number,
  axis: SortAxis,
): number {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const centreX = (b.left + b.right) / 2;
    const centreY = (b.top + b.bottom) / 2;
    let pointerIsBefore: boolean;
    if (axis === 'vertical') {
      pointerIsBefore = pointerY < centreY;
    } else if (axis === 'horizontal') {
      pointerIsBefore = pointerX < centreX;
    } else {
      pointerIsBefore = pointerY < b.top || (pointerY <= b.bottom && pointerX < centreX);
    }
    if (pointerIsBefore) return i;
  }
  return boxes.length;
}

// Computed-style properties copied onto the floating ghost so it still looks like
// the source chip after it leaves the host's shadow root (where the real CSS lives).
const GHOST_STYLE_PROPS = [
  'font',
  'color',
  'background',
  'border',
  'borderRadius',
  'padding',
  'boxSizing',
  'lineHeight',
  'textAlign',
] as const;

type Phase = 'idle' | 'pending' | 'dragging';

/**
 * Framework-agnostic single-list sortable reorder for Lit web components, driven
 * by pointer events (mouse/pen drag-threshold, touch long-press) plus a keyboard
 * move-mode. The drag chrome (floating ghost + drop indicator) is rendered into
 * `document.body` so it is never disturbed by the host's Lit re-render, and so it
 * works regardless of the host's `overflow`/stacking context.
 *
 * The controller is intentionally data-free: it emits one {@link SortableOptions.onDrop}
 * and the host mutates its own model (typically via `moveItemInArray`) and re-renders.
 */
export class SortableController<T> implements ReactiveController {
  private readonly host: HostElement;
  private readonly axis: SortAxis;
  private readonly dragThresholdPx: number;
  private readonly longPressMs: number;
  private readonly touchSlopPx: number;
  private readonly opts: SortableOptions<T>;

  private container: Element | null = null;

  // --- pointer drag state ---
  private phase: Phase = 'idle';
  private pointerId = -1;
  private isTouch = false;
  private startX = 0;
  private startY = 0;
  private grabOffsetX = 0;
  private grabOffsetY = 0;
  private sourceIndex = -1;
  private sourceEl: HTMLElement | null = null;
  private sourcePrevOpacity = '';
  private ghost: HTMLElement | null = null;
  private indicator: HTMLElement | null = null;
  private armTimer: ReturnType<typeof setTimeout> | null = null;
  private dropIndex = -1;

  // --- keyboard move-mode state ---
  private grabbedId: string | null = null;

  constructor(host: HostElement, options: SortableOptions<T>) {
    this.host = host;
    this.opts = options;
    this.axis = options.axis ?? 'both';
    this.dragThresholdPx = options.dragThresholdPx ?? 5;
    this.longPressMs = options.longPressMs ?? 600;
    this.touchSlopPx = options.touchSlopPx ?? 10;
    host.addController(this);
  }

  hostDisconnected(): void {
    this.cancel();
    this.detach();
  }

  /** Wire the controller to the element that contains the `[data-sortable-id]` items. Idempotent. */
  attach(container: Element): void {
    if (this.container === container) return;
    this.detach();
    this.container = container;
    container.addEventListener('pointerdown', this.onPointerDown as EventListener);
    container.addEventListener('keydown', this.onKeyDown as EventListener);
  }

  private detach(): void {
    if (!this.container) return;
    this.container.removeEventListener('pointerdown', this.onPointerDown as EventListener);
    this.container.removeEventListener('keydown', this.onKeyDown as EventListener);
    this.container = null;
  }

  private get disabled(): boolean {
    return this.opts.disabled?.() ?? false;
  }

  private itemElements(): HTMLElement[] {
    if (!this.container) return [];
    return Array.from(this.container.querySelectorAll<HTMLElement>('[data-sortable-id]'));
  }

  private indexOfId(id: string): number {
    return this.opts.items().findIndex((item) => this.opts.itemId(item) === id);
  }

  // ---------------------------------------------------------------- pointer

  private onPointerDown = (event: PointerEvent): void => {
    if (this.disabled || this.phase !== 'idle') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const target = event.target as Element | null;
    const itemEl = target?.closest<HTMLElement>('[data-sortable-id]') ?? null;
    if (!itemEl || !this.container?.contains(itemEl)) return;
    if (this.opts.handleSelector && !target?.closest(this.opts.handleSelector)) return;

    const id = itemEl.dataset['sortableId'];
    if (id == null) return;
    const index = this.indexOfId(id);
    if (index < 0) return;

    this.phase = 'pending';
    this.pointerId = event.pointerId;
    this.isTouch = event.pointerType === 'touch';
    this.sourceEl = itemEl;
    this.sourceIndex = index;
    this.startX = event.clientX;
    this.startY = event.clientY;
    const rect = itemEl.getBoundingClientRect();
    this.grabOffsetX = event.clientX - rect.left;
    this.grabOffsetY = event.clientY - rect.top;

    // Note: never preventDefault() a touch pointerdown — it suppresses the
    // synthesised click. Items must set `touch-action: none` in CSS instead.
    window.addEventListener('pointermove', this.onPointerMove as EventListener);
    window.addEventListener('pointerup', this.onPointerUp as EventListener);
    window.addEventListener('pointercancel', this.onPointerUp as EventListener);

    if (this.isTouch) {
      this.armTimer = setTimeout(() => {
        this.armTimer = null;
        if (this.phase === 'pending') this.beginDrag(this.startX, this.startY);
      }, this.longPressMs);
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;

    if (this.phase === 'pending') {
      const dist = Math.hypot(dx, dy);
      if (this.isTouch) {
        // Movement before the long-press fires reads as a scroll/scrub: abort.
        if (dist > this.touchSlopPx) this.cancel();
      } else if (dist > this.dragThresholdPx) {
        this.beginDrag(event.clientX, event.clientY);
      }
      return;
    }

    if (this.phase === 'dragging') {
      event.preventDefault();
      this.updateDrag(event.clientX, event.clientY);
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    if (this.phase === 'dragging') {
      this.finishDrag();
    } else {
      this.cancel();
    }
  };

  private beginDrag(clientX: number, clientY: number): void {
    if (!this.sourceEl) return;
    this.phase = 'dragging';
    if (this.armTimer) {
      clearTimeout(this.armTimer);
      this.armTimer = null;
    }
    this.dropIndex = this.sourceIndex;

    const rect = this.sourceEl.getBoundingClientRect();
    this.ghost = this.buildGhost(this.sourceEl, rect);
    document.body.appendChild(this.ghost);

    this.indicator = this.buildIndicator();
    document.body.appendChild(this.indicator);

    this.sourcePrevOpacity = this.sourceEl.style.opacity;
    this.sourceEl.style.opacity = '0.4';

    this.updateDrag(clientX, clientY);
  }

  private updateDrag(clientX: number, clientY: number): void {
    if (this.ghost) {
      this.ghost.style.left = `${clientX - this.grabOffsetX}px`;
      this.ghost.style.top = `${clientY - this.grabOffsetY}px`;
    }

    const others = this.itemElements().filter((el) => el !== this.sourceEl);
    const boxes = others.map((el) => el.getBoundingClientRect());
    this.dropIndex = resolveDropIndex(boxes, clientX, clientY, this.axis);
    this.positionIndicator(others, boxes);
  }

  private finishDrag(): void {
    const from = this.sourceIndex;
    const to = this.dropIndex;
    this.cleanupDrag();
    this.phase = 'idle';
    this.removeWindowListeners();
    if (to >= 0 && to !== from) {
      this.emitDrop({ previousIndex: from, currentIndex: to });
    }
  }

  private cancel(): void {
    if (this.phase === 'idle') {
      this.removeWindowListeners();
      return;
    }
    this.cleanupDrag();
    this.phase = 'idle';
    this.removeWindowListeners();
  }

  private cleanupDrag(): void {
    if (this.armTimer) {
      clearTimeout(this.armTimer);
      this.armTimer = null;
    }
    if (this.ghost) {
      this.ghost.remove();
      this.ghost = null;
    }
    if (this.indicator) {
      this.indicator.remove();
      this.indicator = null;
    }
    if (this.sourceEl) {
      this.sourceEl.style.opacity = this.sourcePrevOpacity;
    }
    this.sourceEl = null;
  }

  private removeWindowListeners(): void {
    window.removeEventListener('pointermove', this.onPointerMove as EventListener);
    window.removeEventListener('pointerup', this.onPointerUp as EventListener);
    window.removeEventListener('pointercancel', this.onPointerUp as EventListener);
    this.pointerId = -1;
  }

  private buildGhost(source: HTMLElement, rect: DOMRect): HTMLElement {
    const ghost = source.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('data-sortable-id');
    const computed = getComputedStyle(source);
    for (const prop of GHOST_STYLE_PROPS) {
      ghost.style[prop] = computed[prop] as string;
    }
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      pointerEvents: 'none',
      zIndex: '2147483647',
      opacity: '0.9',
      boxShadow: '0 0.25rem 0.75rem rgba(0, 0, 0, 0.3)',
    } satisfies Partial<CSSStyleDeclaration>);
    ghost.classList.add('mp-sortable-ghost');
    return ghost;
  }

  private buildIndicator(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'mp-sortable-indicator';
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: '2147483646',
      background: 'currentColor',
      pointerEvents: 'none',
      borderRadius: '1px',
    } satisfies Partial<CSSStyleDeclaration>);
    return el;
  }

  private positionIndicator(others: HTMLElement[], boxes: DOMRect[]): void {
    if (!this.indicator) return;
    const vertical = this.axis === 'vertical';
    if (others.length === 0) {
      this.indicator.style.display = 'none';
      return;
    }
    this.indicator.style.display = '';
    if (this.dropIndex < boxes.length) {
      const b = boxes[this.dropIndex];
      if (vertical) {
        this.setIndicatorBar(b.left, b.top, b.width, 2, true);
      } else {
        this.setIndicatorBar(b.left, b.top, 2, b.height, false);
      }
    } else {
      const b = boxes[boxes.length - 1];
      if (vertical) {
        this.setIndicatorBar(b.left, b.bottom, b.width, 2, true);
      } else {
        this.setIndicatorBar(b.right, b.top, 2, b.height, false);
      }
    }
  }

  private setIndicatorBar(x: number, y: number, w: number, h: number, horizontalBar: boolean): void {
    if (!this.indicator) return;
    Object.assign(this.indicator.style, {
      left: `${horizontalBar ? x : x - 1}px`,
      top: `${horizontalBar ? y - 1 : y}px`,
      width: `${w}px`,
      height: `${h}px`,
    });
  }

  // --------------------------------------------------------------- keyboard

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.disabled) return;
    const target = event.target as Element | null;
    const itemEl = target?.closest<HTMLElement>('[data-sortable-id]') ?? null;
    if (!itemEl) return;
    const id = itemEl.dataset['sortableId'];
    if (id == null) return;

    const key = event.key;
    if (this.grabbedId == null) {
      if (key === 'm' || key === 'M') {
        event.preventDefault();
        this.grabbedId = id;
        this.announceFor(id, (label, pos, total) => `${label} grabbed. Position ${pos} of ${total}. Use arrow keys to move, Enter to drop.`);
      }
      return;
    }

    // grabbed
    if (key === 'Escape' || key === 'Enter' || key === 'm' || key === 'M') {
      event.preventDefault();
      const droppedId = this.grabbedId;
      this.grabbedId = null;
      this.announceFor(droppedId, (label, pos, total) => `${label} dropped. Position ${pos} of ${total}.`);
      return;
    }

    const back = key === 'ArrowLeft' || key === 'ArrowUp';
    const forward = key === 'ArrowRight' || key === 'ArrowDown';
    if (!back && !forward) return;
    event.preventDefault();

    const from = this.indexOfId(this.grabbedId);
    if (from < 0) return;
    const total = this.opts.items().length;
    const to = Math.max(0, Math.min(total - 1, from + (forward ? 1 : -1)));
    if (to === from) return;

    const grabbedId = this.grabbedId;
    this.emitDrop({ previousIndex: from, currentIndex: to });
    void this.host.updateComplete.then(() => {
      const moved = this.container?.querySelector<HTMLElement>(
        `[data-sortable-id="${cssEscape(grabbedId)}"]`,
      );
      moved?.focus();
    });
    this.announceFor(grabbedId, (label, pos, t) => `${label} moved to position ${pos} of ${t}.`);
  };

  private emitDrop(event: SortDropEvent): void {
    this.opts.onDrop(event);
  }

  private announceFor(id: string, make: (label: string, position: number, total: number) => string): void {
    if (!this.opts.announce) return;
    const items = this.opts.items();
    const index = items.findIndex((item) => this.opts.itemId(item) === id);
    if (index < 0) return;
    const item = items[index];
    const label =
      this.opts.label?.(item) ??
      this.container?.querySelector<HTMLElement>(`[data-sortable-id="${cssEscape(id)}"]`)?.textContent?.trim() ??
      'Item';
    this.opts.announce(make(label, index + 1, items.length));
  }
}

function cssEscape(value: string): string {
  const cssApi = (globalThis as { CSS?: { escape?: (v: string) => string } }).CSS;
  if (cssApi?.escape) return cssApi.escape(value);
  return value.replace(/["\\]/g, '\\$&');
}
