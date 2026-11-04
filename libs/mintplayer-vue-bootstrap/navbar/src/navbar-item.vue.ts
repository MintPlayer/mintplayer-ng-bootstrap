import type { FunctionalComponent } from 'vue';
import { markLinks } from '../../machine/src/index';

/*
 * The Vue extension of the generated `BsNavbarItem` (PRD #437 D10 escape
 * hatch): the item's link becomes a `.nav-link` (the class only;
 * consumer DOM is never stamped). (Inside
 * a dropdown the entries are `BsDropdownItem`s, whose links stay plain.)
 */
export const Children: FunctionalComponent = (_, { slots }) => markLinks(slots['default']?.(), 'nav-link');
