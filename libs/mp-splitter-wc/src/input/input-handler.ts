import type { NormalizedPointerEvent } from './pointer-event';
import { normalizePointerEvent } from './pointer-event';

export interface InputHandlerCallbacks {
  onResizeStart: (event: NormalizedPointerEvent, dividerIndex: number, dividerElement: HTMLElement) => void;
  onResizeMove: (event: NormalizedPointerEvent) => void;
  onResizeEnd: (event: NormalizedPointerEvent) => void;
}

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

    dividerElement.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    dividerElement.addEventListener('touchend', this.boundTouchEnd);
    dividerElement.addEventListener('touchcancel', this.boundTouchEnd);
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isActive) return;
    event.preventDefault();
    this.callbacks.onResizeMove(normalizePointerEvent(event));
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isActive) return;
    this.endResize(event);

    if (this.currentDividerElement) {
      this.currentDividerElement.removeEventListener('touchmove', this.boundTouchMove);
      this.currentDividerElement.removeEventListener('touchend', this.boundTouchEnd);
      this.currentDividerElement.removeEventListener('touchcancel', this.boundTouchEnd);
    }
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

    if (this.currentDividerElement) {
      this.currentDividerElement.removeEventListener('touchmove', this.boundTouchMove);
      this.currentDividerElement.removeEventListener('touchend', this.boundTouchEnd);
      this.currentDividerElement.removeEventListener('touchcancel', this.boundTouchEnd);
    }

    this.isActive = false;
    this.currentDividerIndex = -1;
    this.currentDividerElement = null;
  }

  getIsActive(): boolean {
    return this.isActive;
  }
}
