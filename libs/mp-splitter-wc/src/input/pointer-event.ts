import type { Point } from '../types';

export interface NormalizedPointerEvent {
  clientX: number;
  clientY: number;
  point: Point;
  originalEvent: MouseEvent | TouchEvent;
  isTouch: boolean;
}

export function normalizePointerEvent(
  event: MouseEvent | TouchEvent
): NormalizedPointerEvent {
  const isTouch = 'touches' in event;

  let clientX: number;
  let clientY: number;

  if (isTouch) {
    const touch = (event as TouchEvent).touches[0] || (event as TouchEvent).changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    clientX = (event as MouseEvent).clientX;
    clientY = (event as MouseEvent).clientY;
  }

  return {
    clientX,
    clientY,
    point: { x: clientX, y: clientY },
    originalEvent: event,
    isTouch,
  };
}
