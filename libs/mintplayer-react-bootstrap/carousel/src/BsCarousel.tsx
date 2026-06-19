import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpCarousel,
  type CarouselPausedChangeEventDetail,
  type CarouselSlideChangeEventDetail,
} from '@mintplayer/web-components/carousel';

/**
 * React wrapper for `<mp-carousel>`. Side-effect-registers the WC.
 *
 * Slides are the element's children — pass them through directly. Scalar config
 * (`orientation`, `animation`, `interval`, `wrap`, `indicators`,
 * `keyboardEvents`) and the controlled `paused` / `index` are forwarded by
 * @lit/react as element properties; listen to `onSlideChange` /
 * `onPausedChange` to keep your state in sync (the WC is host-controlled).
 *
 *     <BsCarousel interval={4000} indicators paused={paused}
 *       onSlideChange={(e) => setIndex(e.detail.index)}
 *       onPausedChange={(e) => setPaused(e.detail.paused)}>
 *       <img src="a.jpg" /><img src="b.jpg" />
 *     </BsCarousel>
 */
export const BsCarousel = createComponent({
  react: React,
  tagName: 'mp-carousel',
  elementClass: MpCarousel,
  events: {
    onSlideChange: 'slide-change' as EventName<CustomEvent<CarouselSlideChangeEventDetail>>,
    onPausedChange: 'paused-change' as EventName<CustomEvent<CarouselPausedChangeEventDetail>>,
    onAnimationStart: 'animation-start' as EventName<CustomEvent<void>>,
    onAnimationEnd: 'animation-end' as EventName<CustomEvent<void>>,
  },
});
