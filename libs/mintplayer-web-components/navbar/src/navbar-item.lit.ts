import { markLinks } from '@mintplayer/web-components/machine';

/*
 * The Lit extension of the generated `mp-navbar-item` (PRD #437 D10 escape
 * hatch): the item's link becomes a `.nav-link` (the class only;
 * consumer DOM is never stamped). (Inside
 * a dropdown the entries are `mp-dropdown-item`s, whose links stay plain.)
 */
export function children(nodes: readonly Node[], _host: HTMLElement): void {
  markLinks(nodes, 'nav-link');
}
