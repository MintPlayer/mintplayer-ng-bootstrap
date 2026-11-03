import { cloneVNode, isVNode, type FunctionalComponent } from 'vue';
import { NAV_LINK_CLASS } from '@mintplayer/ui-core/nav';

/*
 * The Vue extension of the generated `BsNavItem` (PRD #437 D10 escape hatch):
 * the item's link becomes a `.nav-link` of the nav scope, so the nav part
 * (`.nav-link:where([data-mps])`) styles it. A `RouterLink` falls both through to its `<a>`.
 */

export const Children: FunctionalComponent = (_, { slots }) =>
  slots['default']?.().map((node) =>
    isVNode(node) && typeof node.type !== 'symbol' ? cloneVNode(node, { class: NAV_LINK_CLASS, 'data-mps': 'nav' }) : node,
  );
