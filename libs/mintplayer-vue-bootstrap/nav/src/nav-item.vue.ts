import type { FunctionalComponent } from 'vue';
import { NAV_LINK_CLASS } from '@mintplayer/ui-core/nav';
import { markLinks } from '../../machine/src/index';

/*
 * The Vue extension of the generated `BsNavItem` (PRD #437 D10 escape hatch):
 * the item's link becomes a `.nav-link` (the class only;
 * consumer DOM is never stamped).
 */
export const Children: FunctionalComponent = (_, { slots }) => markLinks(slots['default']?.(), NAV_LINK_CLASS);
