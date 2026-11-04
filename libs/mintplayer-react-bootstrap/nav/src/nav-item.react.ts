import type { ReactNode } from 'react';
import { NAV_LINK_CLASS } from '@mintplayer/ui-core/nav';
import { markLinks } from '../../machine/src/index';

/*
 * The React extension of the generated `BsNavItem` (PRD #437 D10 escape hatch):
 * the item's link becomes a `.nav-link` (the class only;
 * consumer DOM is never stamped).
 */
export function Children({ children }: { children?: ReactNode }) {
  return markLinks(children, NAV_LINK_CLASS);
}
