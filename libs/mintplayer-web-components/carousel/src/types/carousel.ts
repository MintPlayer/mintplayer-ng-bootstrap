export type CarouselAnimation = 'slide' | 'fade' | 'none';
export type CarouselOrientation = 'horizontal' | 'vertical';

export interface CarouselSlideChangeEventDetail {
  /** The committed slide index. */
  index: number;
}

export interface CarouselPausedChangeEventDetail {
  /** Whether autoplay is now paused. Emitted only for user/programmatic-API intent. */
  paused: boolean;
}
