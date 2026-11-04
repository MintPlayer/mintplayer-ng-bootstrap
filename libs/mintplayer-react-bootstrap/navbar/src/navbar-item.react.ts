import type { ReactNode } from 'react';
import { markLinks } from '../../machine/src/index';

/*
 * The React extension of the generated `BsNavbarItem` (PRD #437 D10 escape
 * hatch): the item's link becomes a `.nav-link` of the navbar scope. (Inside
 * a dropdown the entries are `BsDropdownItem`s, whose links stay plain.)
 */
export function Children({ children }: { children?: ReactNode }) {
  return markLinks(children, 'nav-link', 'navbar');
}
