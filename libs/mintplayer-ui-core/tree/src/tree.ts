/** A node of a hierarchical list (treeview, tree-select, file-manager folders). */
export interface TreeNode {
  id: string;
  label: string;
  iconKey?: string;
  children?: TreeNode[];
  /**
   * Shows the expand chevron even without `children`, so a loader can run on
   * first expansion. Once children are populated it behaves like any parent.
   */
  lazy?: boolean;
  meta?: Record<string, unknown>;
}

export interface TreeIndex<N extends TreeNode = TreeNode> {
  readonly byId: ReadonlyMap<string, N>;
  /** `null` for a root node. */
  readonly parentById: ReadonlyMap<string, N | null>;
}

export function hasChildren(node: TreeNode): boolean {
  return !!node.children && node.children.length > 0;
}

/** Can the node be expanded (it has children, or loads them lazily)? */
export function isExpandable(node: TreeNode): boolean {
  return hasChildren(node) || !!node.lazy;
}

function entries<N extends TreeNode>(nodes: ReadonlyArray<N>, parent: N | null): [N, N | null][] {
  return nodes.flatMap((node) => [[node, parent] as [N, N | null], ...entries((node.children ?? []) as N[], node)]);
}

/** Id → node and id → parent for every node at any depth. */
export function indexTree<N extends TreeNode>(nodes: ReadonlyArray<N>): TreeIndex<N> {
  const all = entries(nodes, null);
  return {
    byId: new Map(all.map(([node]) => [node.id, node])),
    parentById: new Map(all.map(([node, parent]) => [node.id, parent])),
  };
}

/** The nodes a user can see, in reading order: a node's children follow it only while it is expanded. */
export function visibleOrder<N extends TreeNode>(nodes: ReadonlyArray<N>, expanded: ReadonlySet<string>): N[] {
  return nodes.flatMap((node) => [
    node,
    ...(hasChildren(node) && expanded.has(node.id) ? visibleOrder(node.children as N[], expanded) : []),
  ]);
}

/** The ids from the root down to (excluding) `id`: what must be expanded to reveal it. */
export function ancestorIds(index: TreeIndex, id: string): string[] {
  const parent = index.parentById.get(id);
  return parent ? [...ancestorIds(index, parent.id), parent.id] : [];
}

export type TreeKeyAction =
  | { type: 'focus'; id: string }
  | { type: 'expand'; id: string }
  | { type: 'collapse'; id: string }
  /** Enter: select, and toggle expansion when expandable. */
  | { type: 'activate'; id: string; toggle: boolean }
  /** Space: toggle selection; `additive` in multiple mode. */
  | { type: 'select'; id: string; additive: boolean };

export interface TreeKeyContext {
  /** The node the key went to. */
  node: TreeNode;
  expanded: ReadonlySet<string>;
  /** Current {@link visibleOrder}. */
  visible: ReadonlyArray<TreeNode>;
  index: TreeIndex;
  multiple?: boolean;
  /** Swap ArrowLeft and ArrowRight. */
  rtl?: boolean;
}

/**
 * The WAI-ARIA APG tree keymap, as data. Returns the action for `key`, or
 * `null` when the key is not the tree's (the front then leaves the event alone).
 * A key the tree owns but that has no effect here (ArrowDown on the last row)
 * returns a focus on the same node, so the front still consumes it.
 */
export function treeKeyAction(key: string, context: TreeKeyContext): TreeKeyAction | null {
  const { node, expanded, visible, index } = context;
  const open = expanded.has(node.id);
  const at = visible.findIndex((n) => n.id === node.id);
  const focus = (target: TreeNode | undefined): TreeKeyAction => ({ type: 'focus', id: (target ?? node).id });
  const inward = context.rtl ? 'ArrowLeft' : 'ArrowRight';
  const outward = context.rtl ? 'ArrowRight' : 'ArrowLeft';

  switch (key) {
    case 'ArrowDown':
      return focus(visible[Math.min(at + 1, visible.length - 1)]);
    case 'ArrowUp':
      return focus(visible[Math.max(at - 1, 0)]);
    case 'Home':
      return focus(visible[0]);
    case 'End':
      return focus(visible[visible.length - 1]);
    case inward:
      if (isExpandable(node) && !open) return { type: 'expand', id: node.id };
      return focus(hasChildren(node) && open ? node.children?.[0] : undefined);
    case outward:
      if (isExpandable(node) && open) return { type: 'collapse', id: node.id };
      return focus(index.parentById.get(node.id) ?? undefined);
    case 'Enter':
      return { type: 'activate', id: node.id, toggle: isExpandable(node) };
    case ' ':
    case 'Spacebar':
      return { type: 'select', id: node.id, additive: !!context.multiple };
    default:
      return null;
  }
}
