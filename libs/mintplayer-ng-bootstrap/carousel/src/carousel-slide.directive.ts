import { Directive, contentChildren } from '@angular/core';

/*
 * The carousel's slide count for the server render (PRD #437 D10). The parent
 * template renders one radio, indicator and control pair per slide BEFORE its
 * content, so it needs N from the declaration, not from the DOM.
 */

/** Marks a `bs-carousel-item` (its extension's host directive). */
@Directive({ selector: '[bsCarouselSlide]' })
export class BsCarouselSlideDirective {}

/** On `bs-carousel`: counts its own items (not a nested carousel's). */
@Directive({ selector: '[bsCarouselSlides]' })
export class BsCarouselSlidesDirective {
  readonly slides = contentChildren(BsCarouselSlideDirective);
}
