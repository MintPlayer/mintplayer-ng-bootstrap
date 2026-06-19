import type { SwipeAnimation, SwipeOrientation } from '@mintplayer/web-components/swiper-core';

export type CarouselOrientation = SwipeOrientation;
export type CarouselAnimation = SwipeAnimation;

/** Detail of the `slide-change` event: the new active slide index (0-based). */
export interface CarouselSlideChangeEventDetail {
  index: number;
}

/** Detail of the `paused-change` event: the resolved auto-advance paused state. */
export interface CarouselPausedChangeEventDetail {
  paused: boolean;
}
