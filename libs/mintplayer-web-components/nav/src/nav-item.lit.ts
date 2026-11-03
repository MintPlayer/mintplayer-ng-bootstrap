import { NAV_LINK_CLASS } from '@mintplayer/ui-core/nav';

/*
 * The Lit extension of the generated `mp-nav-item` (PRD #437 D10 escape hatch):
 * the item's link becomes a `.nav-link` of the nav scope, so the nav part
 * (`.nav-link:where([data-mps])`) styles it. Called on every update; both writes are idempotent.
 */

export function children(nodes: readonly Node[]): void {
  nodes
    .filter((node): node is Element => node instanceof Element)
    .forEach((link) => {
      link.classList.add(NAV_LINK_CLASS);
      link.setAttribute('data-mps', 'nav');
    });
}
