import { inject, type FunctionalComponent } from 'vue';
import { NAVBAR_NESTING } from '@mintplayer/ui-core/navbar';
import { markLinks, vueCoreContextKey } from '../../machine/src/index';

/*
 * The Vue extension of the generated `BsNavbarItem` (PRD #437 D10 escape
 * hatch): in the bar, the item's link becomes a `.nav-link` of the navbar
 * scope. In a dropdown panel the item itself is the `.dropdown-item`.
 */
export const Children: FunctionalComponent = (_, { slots }) => {
  const inMenu = (inject(vueCoreContextKey(NAVBAR_NESTING), null)?.value.depth ?? -1) >= 0;
  const nodes = slots['default']?.();
  return inMenu ? nodes : markLinks(nodes, 'nav-link', 'navbar');
};
