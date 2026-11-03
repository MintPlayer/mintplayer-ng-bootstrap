import { cloneVNode, isVNode, type VNode } from 'vue';

/**
 * A component's consumer links (its slot's element and component vnodes),
 * marked with a Bootstrap class and the component's scope, so the scoped
 * Bootstrap part (`.nav-link:where([data-mps])`) styles them. A `RouterLink`
 * falls both through to its `<a>`.
 */
export function markLinks(nodes: VNode[] | undefined, className: string, scope: string): VNode[] | undefined {
  return nodes?.map((node) =>
    isVNode(node) && typeof node.type !== 'symbol' ? cloneVNode(node, { class: className, 'data-mps': scope }) : node,
  );
}
