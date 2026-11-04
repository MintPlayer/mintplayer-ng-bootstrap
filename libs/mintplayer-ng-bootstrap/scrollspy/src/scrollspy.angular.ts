import { inject } from '@angular/core';
import { ROUTER_CONFIGURATION } from '@angular/router';
import type { ScrollspyInputs } from '@mintplayer/ui-core/scrollspy';

/*
 * The Angular extension of the generated `bs-scrollspy` (PRD #437 D10 escape
 * hatch): without an `offset` of its own, the trigger line sits where the
 * router's `scrollOffset` puts an anchor (`withInMemoryScrolling`), so the
 * active section and a clicked entry agree with the router's fragment
 * scrolling under a fixed navbar. Without a router the offset is 0.
 */
export function extendInputs(inputs: () => ScrollspyInputs): () => ScrollspyInputs {
  const scrollOffset = inject(ROUTER_CONFIGURATION, { optional: true })?.scrollOffset;
  const routerOffset = (): number => {
    if (!scrollOffset) return 0;
    return (Array.isArray(scrollOffset) ? scrollOffset : scrollOffset())[1];
  };
  return () => {
    const value = inputs();
    return value.offset ? value : { ...value, offset: routerOffset() };
  };
}
