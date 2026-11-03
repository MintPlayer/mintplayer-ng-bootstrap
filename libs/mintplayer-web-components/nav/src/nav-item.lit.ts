import { NAV_LINK_CLASS } from '@mintplayer/ui-core/nav';
import { markLinks } from '@mintplayer/web-components/machine';

/*
 * The Lit extension of the generated `mp-nav-item` (PRD #437 D10 escape hatch):
 * the item's link becomes a `.nav-link` of the nav scope.
 */
export function children(nodes: readonly Node[], _host: HTMLElement): void {
  markLinks(nodes, NAV_LINK_CLASS, 'nav');
}
