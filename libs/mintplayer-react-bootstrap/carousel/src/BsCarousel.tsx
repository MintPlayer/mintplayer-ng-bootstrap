import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
// Side-effect-registers the WC on import. The React SSR entry installs the
// lit-ssr DOM shim before any wrapper module loads, so this is Node-safe.
import {
  MpCarousel,
  type CarouselAnimation,
  type CarouselOrientation,
  type CarouselPausedChangeEventDetail,
  type CarouselSlideChangeEventDetail,
} from '@mintplayer/web-components/carousel';

/* Omits React's native CSS-animation handlers because this component's
   `onAnimationStart`/`onAnimationEnd` are the WC's own lifecycle events and
   collide by name. Consequence worth knowing: a consumer cannot attach the real
   DOM animation listeners to <BsCarousel>. Renaming ours (e.g. onTransitionStart)
   would remove the collision, but that is a public API change tracked separately. */
export interface BsCarouselProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'onAnimationStart' | 'onAnimationEnd'> {
  /** Slide transition: `slide` (default), `fade`, or `none`. */
  animation?: CarouselAnimation;
  orientation?: CarouselOrientation;
  /** Show the indicator dots. */
  indicators?: boolean;
  /** Auto-advance interval in ms; omit for no autoplay. */
  interval?: number;
  /** Wrap around at the ends (default true). */
  wrap?: boolean;
  /** Arrow/Home/End navigation on the focused viewport (default true). */
  keyboardEvents?: boolean;
  /** Whether autoplay is paused (controlled via onPausedChange). */
  paused?: boolean;
  onSlideChange?: (event: CustomEvent<CarouselSlideChangeEventDetail>) => void;
  onPausedChange?: (event: CustomEvent<CarouselPausedChangeEventDetail>) => void;
  onAnimationStart?: (event: CustomEvent<void>) => void;
  onAnimationEnd?: (event: CustomEvent<void>) => void;
  className?: string;
  /** Slides (plus an optional element with slot="play-pause"). */
  children?: React.ReactNode;
}

/**
 * Inner `@lit/react` component, retyped to the wire shape the facade emits:
 * attribute-named/attribute-valued props so React SSR serialises them into the
 * HTML (the DSD injector and the no-JS CSS select on the attributes), while on
 * the client `createComponent` routes prototype-matching names through the
 * WC's reflecting property setters — same single store either way.
 */
type MpCarouselInnerProps = {
  animation?: CarouselAnimation;
  orientation?: CarouselOrientation;
  indicators?: boolean;
  interval?: number;
  wrap?: 'false';
  'keyboard-events'?: 'false';
  paused?: boolean;
  'aria-label'?: string;
  className?: string;
  children?: React.ReactNode;
  onSlideChange?: (event: CustomEvent<CarouselSlideChangeEventDetail>) => void;
  onPausedChange?: (event: CustomEvent<CarouselPausedChangeEventDetail>) => void;
  onAnimationStart?: (event: CustomEvent<void>) => void;
  onAnimationEnd?: (event: CustomEvent<void>) => void;
} & React.RefAttributes<MpCarousel>;

const MpCarouselComponent = createComponent({
  react: React,
  tagName: 'mp-carousel',
  elementClass: MpCarousel,
  events: {
    onSlideChange: 'slide-change' as EventName<CustomEvent<CarouselSlideChangeEventDetail>>,
    onPausedChange: 'paused-change' as EventName<CustomEvent<CarouselPausedChangeEventDetail>>,
    onAnimationStart: 'animation-start' as EventName<CustomEvent<void>>,
    onAnimationEnd: 'animation-end' as EventName<CustomEvent<void>>,
  },
}) as unknown as React.ForwardRefExoticComponent<MpCarouselInnerProps>;

export const BsCarousel = React.forwardRef<MpCarousel, BsCarouselProps>(function BsCarousel(
  { indicators, interval, wrap, keyboardEvents, paused, ...props },
  ref,
) {
  return (
    <MpCarouselComponent
      ref={ref}
      {...(indicators ? { indicators: true } : {})}
      {...(interval && interval > 0 ? { interval } : {})}
      {...(wrap === false ? { wrap: 'false' as const } : {})}
      {...(keyboardEvents === false ? { 'keyboard-events': 'false' as const } : {})}
      {...(paused ? { paused: true } : {})}
      {...props}
    />
  );
});
