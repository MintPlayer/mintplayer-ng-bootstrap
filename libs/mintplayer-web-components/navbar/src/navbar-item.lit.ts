import { markLinks } from '@mintplayer/web-components/machine';

/*
 * The Lit extension of the generated `mp-navbar-item` (PRD #437 D10 escape
 * hatch): in the bar, the item's link becomes a `.nav-link` of the navbar
 * scope. In a dropdown panel the item itself is the `.dropdown-item`.
 */
export function children(nodes: readonly Node[], host: HTMLElement): void {
  if (!host.parentElement?.closest('mp-navbar-dropdown')) markLinks(nodes, 'nav-link', 'navbar');
}
