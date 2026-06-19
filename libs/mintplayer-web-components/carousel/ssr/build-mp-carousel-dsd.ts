import { carouselStyles } from '../src/styles';
import type { CarouselAnimation, CarouselOrientation } from '../src/types';

/**
 * The attributes that shape an `<mp-carousel>`'s no-JS Declarative Shadow DOM.
 * `slideCount` is the number of slide children — the framework wrappers emit it
 * as a `slide-count` attribute because lit-ssr can't see slotted light-DOM
 * children at render time, so the server can't count them itself.
 */
export interface MpCarouselDsdAttrs {
  /** Unique id stem for this carousel's radios on the page (e.g. `mp-car-0`). */
  uid: string;
  slideCount: number;
  animation: CarouselAnimation;
  orientation: CarouselOrientation;
  ariaLabel?: string | null;
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Per-index CSS the static stylesheet can't express (it depends on the slide
 * count). For each slide N: when its radio is checked, promote the Nth slotted
 * slide to the foreground (opaque + in-flow so it sets the inner height) and
 * light up the Nth dot. All gated by `:host(:not(:defined))` so they evaporate
 * the moment the element upgrades. Mirrors the `.carousel.fade` base rules in
 * carousel.styles.scss.
 */
function fadeIndexRules(uid: string, count: number): string {
  let css = '';
  for (let i = 0; i < count; i++) {
    const radio = `:host(:not(:defined)) #${uid}-s${i}:checked ~`;
    css +=
      `${radio} .carousel-inner ::slotted(:nth-child(${i + 1})){opacity:1;position:relative;}` +
      `${radio} .nojs-indicators .nojs-indicator:nth-child(${i + 1}){background-color:#fff;}`;
  }
  return css;
}

/**
 * Builds the `<template shadowrootmode="open">` for an `<mp-carousel>` so it
 * renders and is navigable with JavaScript disabled. Pure string construction
 * (no DOM, no lit-ssr) so it is safe to call from any SSR server — including
 * inside `@angular/ssr`, where running lit-ssr would clash with Domino over the
 * global DOM shim.
 *
 * The DSD is the *no-JS tier* and is intentionally NOT the same markup as the
 * element's hydrated `render()`: `fade` becomes a radio + dot crossfade machine,
 * everything else a native scroll-snap strip. The element discards this chrome
 * on upgrade (see `MpCarousel.createRenderRoot`), so the two need not match.
 *
 * Styling is shared, not duplicated: the component's compiled stylesheet
 * (`carouselStyles`, the same one the client adopts via `static styles`) is
 * inlined here because constructable sheets don't apply without JS; only the
 * count-dependent fade rules are generated on top.
 */
export function buildMpCarouselDsd(attrs: MpCarouselDsdAttrs): string {
  const { uid, slideCount, animation, orientation } = attrs;
  // Fade needs to know the slide count to wire its radios; if a wrapper failed
  // to provide it, fall back to the scroll-snap strip, which shows every slide
  // regardless of count rather than risking a frozen/blank fade.
  const fade = animation === 'fade' && slideCount >= 1;

  const carouselClasses = [
    'carousel',
    'mx-auto',
    animation === 'slide' ? 'slide' : '',
    animation === 'fade' ? 'fade' : '',
    orientation === 'vertical' ? 'carousel-vertical' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const styles = carouselStyles.cssText + (fade ? fadeIndexRules(uid, slideCount) : '');

  const radios = fade
    ? Array.from(
        { length: slideCount },
        (_, i) =>
          `<input type="radio" name="${uid}" id="${uid}-s${i}" class="nojs-radio"` +
          ` aria-hidden="true" tabindex="-1"${i === 0 ? ' checked' : ''}>`,
      ).join('')
    : '';

  const dots = fade
    ? `<div class="nojs-indicators">` +
      Array.from(
        { length: slideCount },
        (_, i) =>
          `<label class="nojs-indicator" for="${uid}-s${i}" aria-label="Slide ${i + 1}"></label>`,
      ).join('') +
      `</div>`
    : '';

  const ariaLabel = attrs.ariaLabel ? ` aria-label="${escapeHtml(attrs.ariaLabel)}"` : '';

  return (
    `<template shadowrootmode="open"><style>${styles}</style>` +
    `<div class="${carouselClasses}" role="region" aria-roledescription="carousel"${ariaLabel}>` +
    radios +
    `<div class="carousel-inner" tabindex="0">` +
    `<div class="carousel-track">` +
    `<div class="carousel-clone clone-before" aria-hidden="true"></div>` +
    `<slot></slot>` +
    `<div class="carousel-clone clone-after" aria-hidden="true"></div>` +
    `</div></div>` +
    dots +
    `</div></template>`
  );
}
