import { useContext, type ReactNode } from 'react';
import { NAVBAR_NESTING } from '@mintplayer/ui-core/navbar';
import { markLinks, reactCoreContext } from '../../machine/src/index';

/*
 * The React extension of the generated `BsNavbarItem` (PRD #437 D10 escape
 * hatch): in the bar, the item's link becomes a `.nav-link` of the navbar
 * scope. In a dropdown panel the item itself is the `.dropdown-item`.
 */
export function Children({ children }: { children?: ReactNode }) {
  const { depth } = useContext(reactCoreContext(NAVBAR_NESTING));
  return depth >= 0 ? children : markLinks(children, 'nav-link', 'navbar');
}
