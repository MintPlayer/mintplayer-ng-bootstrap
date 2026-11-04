import { cloneVNode, Fragment, h, isVNode, type VNode } from 'vue';

/**
 * A component's consumer links (its slot's element and component vnodes),
 * marked with a Bootstrap class only. Consumer DOM is never stamped: the nav part reaches
 * it through its anchor (`.nav-link:where([data-mps], :is(.nav, .navbar-nav)[data-mps] *)`).
 * A `RouterLink` falls it through to its `<a>`. A compiled slot hands its content over
 * wrapped in Fragments (`v-for`, `v-if`, a nested `<slot />`), so they are
 * walked into; text and comments pass through.
 */
export function markLinks(nodes: VNode[] | undefined, className: string): VNode[] | undefined {
  return nodes?.map((node) => markLink(node, className));
}

function markLink(node: VNode, className: string): VNode {
  if (!isVNode(node)) return node;
  if (node.type === Fragment) {
    return Array.isArray(node.children)
      ? h(Fragment, { key: node.key ?? undefined }, markLinks(node.children as VNode[], className))
      : node;
  }
  return typeof node.type === 'symbol' ? node : cloneVNode(node, { class: className });
}
