import { Point } from './point';

export interface StartTouch {
  position: Point;
  timestamp: number;
}

export interface LastTouch {
  position: Point;
  isTouching: boolean;
}
