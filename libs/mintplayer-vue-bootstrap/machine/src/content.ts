import { camelize, Comment, Text, useSlots, type VNode } from 'vue';
import { sameContent, type ContentChild } from '@mintplayer/ui-core/component';

/** A manifest content query: the component it collects, and the wrapper whose props ride along. */
export interface VueContentQuery {
  readonly type: unknown;
  readonly within?: unknown;
}

function propsOf(node: VNode): Record<string, unknown> {
  return Object.fromEntries(Object.entries(node.props ?? {}).map(([key, value]) => [camelize(key), value]));
}

/** A vnode's children: an element's array, or a component's default slot. */
function childrenOf(node: VNode): VNode[] {
  const children = node.children as unknown;
  if (Array.isArray(children)) return children as VNode[];
  const slot = (children as { default?: () => VNode[] } | null)?.default;
  return typeof slot === 'function' ? slot() : [];
}

function collect(nodes: readonly VNode[], query: VueContentQuery, within: Record<string, unknown> | null, out: ContentChild[]): void {
  nodes.forEach((node) => {
    if (!node || typeof node !== 'object' || node.type === Comment || node.type === Text) return;
    if (node.type === query.type) out.push({ inputs: propsOf(node), within });
    else collect(childrenOf(node), query, query.within !== undefined && node.type === query.within ? propsOf(node) : within, out);
  });
}

/**
 * A manifest content query in Vue (PRD #437 D10): the props of every
 * `query.type` vnode in the default slot (camelCased, as declared), read while
 * rendering, so the server render has them. Call it in `setup`; the getter
 * keeps the previous array while nothing changed.
 */
export function useContent(query: VueContentQuery): () => readonly ContentChild[] {
  const slots = useSlots();
  let latest: readonly ContentChild[] = [];
  return () => {
    const next: ContentChild[] = [];
    collect(slots.default?.() ?? [], query, null, next);
    if (!sameContent(latest, next)) latest = next;
    return latest;
  };
}
