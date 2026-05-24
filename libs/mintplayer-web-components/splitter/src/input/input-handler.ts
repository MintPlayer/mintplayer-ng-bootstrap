import type { NormalizedPointerEvent } from './pointer-event';
import { normalizePointerEvent } from './pointer-event';

export interface InputHandlerCallbacks {
  onResizeStart: (event: NormalizedPointerEvent, dividerIndex: number, dividerElement: HTMLElement) => void;
  onResizeMove: (event: NormalizedPointerEvent) => void;
  onResizeEnd: (event: NormalizedPointerEvent) => void;
  /**
   * Keyboard-driven resize. Fires once per arrow / Home / End keystroke on a
   * focused divider. Granularity is encoded as the boolean `fine` (Shift held)
   * — translation to percent/px lives in the splitter, not the input layer.
   */
  onResizeKey?: (key: ResizeKey, fine: boolean, dividerIndex: number, dividerElement: HTMLElement) => void;
}

export type ResizeKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

const RESIZE_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End',
]);

export class InputHandler {
  private isActive = false;
  private currentDividerIndex = -1;
  private currentDividerElement: HTMLElement | null = null;
  private callbacks: InputHandlerCallbacks;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;

  constructor(callbacks: InputHandlerCallbacks) {
    this.callbacks = callbacks;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
  }

  attachDividerListeners(divider: HTMLElement, index: number): void {
    divider.addEventListener('mousedown', (e) => this.handleMouseDown(e, index, divider));
    divider.addEventListener('touchstart', (e) => this.handleTouchStart(e, index, divider), { passive: false });
    divider.addEventListener('keydown', (e) => this.handleKeyDown(e, index, divider));
  }

  private handleKeyDown(event: KeyboardEvent, dividerIndex: number, dividerElement: HTMLElement): void {
    if (!this.callbacks.onResizeKey) return;
    if (!RESIZE_KEYS.has(event.key)) return;
    event.preventDefault();
    this.callbacks.onResizeKey(event.key as ResizeKey, event.shiftKey, dividerIndex, dividerElement);
  }

  private handleMouseDown(event: MouseEvent, dividerIndex: number, dividerElement: HTMLElement): void {
    event.preventDefault();
    this.startResize(event, dividerIndex, dividerElement);

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isActive) return;
    event.preventDefault();
    this.callbacks.onResizeMove(normalizePointerEvent(event));
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isActive) return;
    this.endResize(event);

    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private handleTouchStart(event: TouchEvent, dividerIndex: number, dividerElement: HTMLElement): void {
    event.preventDefault();
    this.startResize(event, dividerIndex, dividerElement);

    document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    document.addEventListener('touchend', this.boundTouchEnd);
    document.addEventListener('touchcancel', this.boundTouchEnd);
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isActive) return;
    event.preventDefault();
    this.callbacks.onResizeMove(normalizePointerEvent(event));
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isActive) return;
    this.endResize(event);

    document.removeEventListener('touchmove', this.boundTouchMove);
    document.removeEventListener('touchend', this.boundTouchEnd);
    document.removeEventListener('touchcancel', this.boundTouchEnd);
  }

  private startResize(event: MouseEvent | TouchEvent, dividerIndex: number, dividerElement: HTMLElement): void {
    this.isActive = true;
    this.currentDividerIndex = dividerIndex;
    this.currentDividerElement = dividerElement;
    this.callbacks.onResizeStart(normalizePointerEvent(event), dividerIndex, dividerElement);
  }

  private endResize(event: MouseEvent | TouchEvent): void {
    this.callbacks.onResizeEnd(normalizePointerEvent(event));
    this.isActive = false;
    this.currentDividerIndex = -1;
    this.currentDividerElement = null;
  }

  dispose(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);

    document.removeEventListener('touchmove', this.boundTouchMove);
    document.removeEventListener('touchend', this.boundTouchEnd);
    document.removeEventListener('touchcancel', this.boundTouchEnd);

    this.isActive = false;
    this.currentDividerIndex = -1;
    this.currentDividerElement = null;
  }

  getIsActive(): boolean {
    return this.isActive;
  }
}
