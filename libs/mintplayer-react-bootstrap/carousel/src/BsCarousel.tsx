import * as React from 'react';
import {
  type MpCarousel,
  type CarouselAnimation,
  type CarouselOrientation,
  type CarouselPausedChangeEventDetail,
  type CarouselSlideChangeEventDetail,
} from '@mintplayer/web-components/carousel';

// Side-effect import: registers the <mp-carousel> custom element (client only;
// on the server it's a bare tag completed by injectMpCarouselDsd).
import '@mintplayer/web-components/carousel';

export interface BsCarouselProps {
  orientation?: CarouselOrientation;
  animation?: CarouselAnimation;
  interval?: number | null;
  wrap?: boolean;
  indicators?: boolean;
  keyboardEvents?: boolean;
  ariaLabel?: string | null;
  /** Controlled active slide index. */
  index?: number;
  paused?: boolean;
  onSlideChange?: (e: CustomEvent<CarouselSlideChangeEventDetail>) => void;
  onPausedChange?: (e: CustomEvent<CarouselPausedChangeEventDetail>) => void;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * React wrapper for `<mp-carousel>`.
 *
 * Every piece of config the WC needs is attribute-backed, so we render the
 * element with config as plain *attributes* rather than via `@lit/react`'s
 * `createComponent`. That matters for SSR: React 19 serializes primitive
 * attributes into the server HTML (createComponent would set them as element
 * *properties*, which only happens on the client), so `injectMpCarouselDsd` can
 * read `animation` / `orientation` / `slide-count` and build the matching no-JS
 * Declarative Shadow DOM. `slide-count` is the projected child count — lit-ssr
 * can't see slotted children, so the wrapper supplies it. The ref is used only
 * for what attributes can't express: CustomEvent listeners and the controlled
 * `index` (a property with no attribute).
 *
 *     <BsCarousel interval={4000} indicators paused={paused}
 *       onSlideChange={(e) => setIndex(e.detail.index)}
 *       onPausedChange={(e) => setPaused(e.detail.paused)}>
 *       <img src="a.jpg" /><img src="b.jpg" />
 *     </BsCarousel>
 */
export function BsCarousel({
  orientation = 'horizontal',
  animation = 'slide',
  interval = null,
  wrap = true,
  indicators = false,
  keyboardEvents = true,
  ariaLabel = null,
  index,
  paused,
  onSlideChange,
  onPausedChange,
  onAnimationStart,
  onAnimationEnd,
  children,
  className,
  style,
}: BsCarouselProps) {
  const ref = React.useRef<MpCarousel | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const slide = (e: Event) => onSlideChange?.(e as CustomEvent<CarouselSlideChangeEventDetail>);
    const paused$ = (e: Event) => onPausedChange?.(e as CustomEvent<CarouselPausedChangeEventDetail>);
    const animStart = () => onAnimationStart?.();
    const animEnd = () => onAnimationEnd?.();
    el.addEventListener('slide-change', slide);
    el.addEventListener('paused-change', paused$);
    el.addEventListener('animation-start', animStart);
    el.addEventListener('animation-end', animEnd);
    return () => {
      el.removeEventListener('slide-change', slide);
      el.removeEventListener('paused-change', paused$);
      el.removeEventListener('animation-start', animStart);
      el.removeEventListener('animation-end', animEnd);
    };
  }, [onSlideChange, onPausedChange, onAnimationStart, onAnimationEnd]);

  // The JS-only config + controlled index/paused are set as element *properties*
  // via the ref, NOT rendered as attributes. React 19 would otherwise serialize
  // them as attributes on the server but set them as properties on the client —
  // and the WC's presence-based booleans (`indicators`, `wrap`, `paused`) don't
  // round-trip through that, producing a hydration mismatch. None of them affect
  // the no-JS DSD, so client-only is correct.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.interval = interval;
    el.wrap = wrap;
    el.indicators = indicators;
    el.keyboardEvents = keyboardEvents;
    if (paused != null) el.paused = paused;
  }, [interval, wrap, indicators, keyboardEvents, paused]);

  React.useEffect(() => {
    const el = ref.current;
    if (el && index != null && el.index !== index) el.index = index;
  }, [index]);

  // Only the string attributes the no-JS DSD builder reads are rendered into the
  // markup — they match between server and client (React 19 sets them as the
  // element's reflecting properties on hydration), so there is no mismatch.
  const attrs: Record<string, string | number | undefined> = {
    animation,
    orientation,
    'slide-count': React.Children.count(children),
    'aria-label': ariaLabel ?? undefined,
  };

  // Raw tag via createElement (not JSX) so we don't need a global intrinsic-
  // element declaration for `mp-carousel`; React 19 emits the primitive attrs
  // into SSR HTML.
  return React.createElement(
    'mp-carousel',
    { ref, className, style, ...attrs },
    children,
  );
}
