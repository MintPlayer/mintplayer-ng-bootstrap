import type { Point } from './point';

export enum ResizeState {
  Idle = 'idle',
  Resizing = 'resizing',
}

export interface ResizeOperation {
  state: ResizeState;
  startPosition: Point;
  sizes: number[];
  indexBefore: number;
  indexAfter: number;
  dividerElement: HTMLElement | null;
}
