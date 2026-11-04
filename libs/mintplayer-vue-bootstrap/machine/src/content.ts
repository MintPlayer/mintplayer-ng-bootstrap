import { camelize, Comment, Text, useSlots, type Slot, type VNode } from 'vue';
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

interface Collected extends ContentChild {
  readonly node: VNode;
}

function collect(nodes: readonly VNode[], query: VueContentQuery, within: Record<string, unknown> | null, out: Collected[]): void {
  nodes.forEach((node) => {
    if (!node || typeof node !== 'object' || node.type === Comment || node.type === Text) return;
    if (node.type === query.type) out.push({ inputs: propsOf(node), within, node });
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
    const found: Collected[] = [];
    collect(slots.default?.() ?? [], query, null, found);
    const next = found.map(({ inputs, within }) => ({ inputs, within }));
    if (!sameContent(latest, next)) latest = next;
    return latest;
  };
}

/** One lent slot, as a component forwards it to its template: the slot named `<prefix><index>:<slot>`. */
export interface LentSlot {
  readonly name: string;
  readonly render: Slot;
}

/**
 * The slots each declaration a content query collects lends its parent's
 * template (#458 Q15): the slot functions of its vnode, named
 * `<prefix><index>:<slot>` for the template's dynamic `<slot :name>`. Call it in
 * `setup`; read the getter while rendering.
 */
export function useLentSlots(query: VueContentQuery, prefix: string): () => readonly LentSlot[] {
  const slots = useSlots();
  return () => {
    const found: Collected[] = [];
    collect(slots.default?.() ?? [], query, null, found);
    return found.flatMap(({ node }, index) =>
      Object.entries((node.children ?? {}) as Record<string, unknown>)
        .filter((entry): entry is [string, Slot] => typeof entry[1] === 'function')
        .map(([slot, render]) => ({ name: `${prefix}${index}:${slot}`, render })),
    );
  };
}
