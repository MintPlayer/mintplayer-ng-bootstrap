import { buildMpCarouselDsd } from './build-mp-carousel-dsd';
import type { CarouselAnimation, CarouselOrientation } from '../src/types';

// Matches each `<mp-carousel …>` open tag NOT already followed by a DSD
// template (the negative lookahead makes a second pass a no-op, and — unlike a
// page-global `shadowrootmode` check — won't be tripped by some *other* element
// emitting DSD). Capture group 1 is the tag's raw attribute text.
const OPEN_TAG = /<mp-carousel\b([^>]*)>(?!\s*<template\b[^>]*shadowrootmode)/g;

function readAttr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
}

/**
 * Injects each `<mp-carousel>`'s no-JS Declarative Shadow DOM into
 * server-rendered HTML so the carousel renders and is navigable with
 * JavaScript disabled. Call it on the HTML string the framework produces,
 * before sending the response — the framework-agnostic counterpart to
 * `injectMpShellDsd`, shared verbatim by all three SSR servers.
 *
 * Unlike the shell (whose chrome is a single static constant), each carousel's
 * DSD depends on its own attributes — slide count, animation, orientation — so
 * this renders one per matched tag via {@link buildMpCarouselDsd}. The browser
 * parser consumes the injected `<template shadowrootmode>` into the element's
 * shadow root; its slotted light-DOM children are untouched.
 */
export function injectMpCarouselDsd(html: string): string {
  if (!html.includes('<mp-carousel')) {
    return html;
  }
  let n = 0;
  return html.replace(OPEN_TAG, (tag, attrs: string) => {
    const animation = (readAttr(attrs, 'animation') as CarouselAnimation) || 'slide';
    const orientation = (readAttr(attrs, 'orientation') as CarouselOrientation) || 'horizontal';
    const slideCount = Number(readAttr(attrs, 'slide-count')) || 0;
    const ariaLabel = readAttr(attrs, 'aria-label');
    const dsd = buildMpCarouselDsd({ uid: `mp-car-${n++}`, slideCount, animation, orientation, ariaLabel });
    return `${tag}${dsd}`;
  });
}
