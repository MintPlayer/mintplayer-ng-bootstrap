import { Comment, Fragment, Text, useSlots, type VNode } from 'vue';
import type { CarouselInputs } from '@mintplayer/ui-core/carousel';

/*
 * The Vue extension of the generated `BsCarousel` (PRD #437 D10): the slide
 * count comes from the default slot's vnodes, so the server render has a
 * radio, indicator and control pair per slide. Every element or component
 * vnode is a slide; fragments (a `v-for`) are flattened.
 */

function countSlides(nodes: readonly VNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === Fragment) return count + countSlides(Array.isArray(node.children) ? (node.children as VNode[]) : []);
    if (node.type === Comment || node.type === Text) return count;
    return count + 1;
  }, 0);
}

export function extendInputs(inputs: () => CarouselInputs): () => CarouselInputs {
  const slots = useSlots();
  return () => ({ ...inputs(), slideCount: countSlides(slots.default?.() ?? []) });
}
