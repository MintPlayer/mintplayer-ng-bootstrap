import { cloneVNode, Fragment, h, isVNode, type VNode } from 'vue';

/**
 * A component's consumer links (its slot's element and component vnodes),
 * marked with a Bootstrap class and the component's scope, so the scoped
 * Bootstrap part (`.nav-link:where([data-mps])`) styles them. A `RouterLink`
 * falls both through to its `<a>`. A compiled slot hands its content over
 * wrapped in Fragments (`v-for`, `v-if`, a nested `<slot />`), so they are
 * walked into; text and comments pass through.
 */
export function markLinks(nodes: VNode[] | undefined, className: string, scope: string): VNode[] | undefined {
  return nodes?.map((node) => markLink(node, className, scope));
}

function markLink(node: VNode, className: string, scope: string): VNode {
  if (!isVNode(node)) return node;
  if (node.type === Fragment) {
    return Array.isArray(node.children)
      ? h(Fragment, { key: node.key ?? undefined }, markLinks(node.children as VNode[], className, scope))
      : node;
  }
  return typeof node.type === 'symbol' ? node : cloneVNode(node, { class: className, 'data-mps': scope });
}
