import { inject } from '@angular/core';
import type { CarouselInputs } from '@mintplayer/ui-core/carousel';
import { BsCarouselSlidesDirective } from './carousel-slide.directive';

/*
 * The Angular extension of the generated `bs-carousel` (PRD #437 D10): the
 * slide count comes from the content query, so the server render has a radio,
 * indicator and control pair per slide.
 */
export const hostDirectives = [BsCarouselSlidesDirective];

export function extendInputs(inputs: () => CarouselInputs): () => CarouselInputs {
  const slides = inject(BsCarouselSlidesDirective, { self: true });
  return () => ({ ...inputs(), slideCount: slides.slides().length });
}
