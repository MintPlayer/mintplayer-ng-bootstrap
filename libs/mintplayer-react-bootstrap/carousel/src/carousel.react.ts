import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import type { CarouselInputs } from '@mintplayer/ui-core/carousel';

/*
 * The React extension of the generated `BsCarousel` (PRD #437 D10): the slide
 * count comes from the declared children, so the server render has a radio,
 * indicator and control pair per slide. Every element child is a slide;
 * fragments are flattened.
 */

function countSlides(children: ReactNode): number {
  return Children.toArray(children).reduce<number>((count, child) => {
    if (!isValidElement(child)) return count;
    if (child.type === Fragment) return count + countSlides((child.props as { children?: ReactNode }).children);
    return count + 1;
  }, 0);
}

export function useExtendInputs(inputs: CarouselInputs, { children }: { children?: ReactNode }): CarouselInputs {
  return { ...inputs, slideCount: countSlides(children) };
}
