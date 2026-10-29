import { hasChildren, indexTree, isExpandable, treeKeyAction, visibleOrder, type TreeNode } from '@mintplayer/ui-core/tree';
import { treeviewLabel, type TreeChildrenLoader, type TreeviewLabels } from './treeview';

/**
 * The tree's behaviour as a sub-machine (PRD #437 D2 (a)): the roving tab stop,
 * the APG keys, expansion and lazy loads over rows that `connectTreeview()`
 * rendered. The treeview core runs it over its own state; the tree-select core
 * runs it over the tree slice of its state and decides what selecting means.
 */

/** The part of a core's state the tree owns. */
export interface TreeSlice {
  expandedIds: readonly string[];
  focusedId: string | null;
  loadingIds: readonly string[];
  errors: Readonly<Record<string, string>>;
  /** Children a lazy node's loader resolved, until the consumer's items carry them. */
  loaded: Readonly<Record<string, readonly TreeNode[]>>;
}

export const EMPTY_TREE_SLICE: TreeSlice = { expandedIds: [], focusedId: null, loadingIds: [], errors: {}, loaded: {} };

export type TreeExpansion =
  | { type: 'expand'; node: TreeNode; expandedIds: readonly string[]; loadedChildren?: readonly TreeNode[] }
  | { type: 'collapse'; node: TreeNode; expandedIds: readonly string[] };

export interface TreeControllerOptions {
  /** Where the click and key listeners go. */
  root: HTMLElement;
  /** The `role=tree` list whose children are the rows. */
  list(): Element | null;
  /** The displayed nodes, loaded children merged in. */
  nodes(): readonly TreeNode[];
  slice(): Readonly<TreeSlice>;
  patch(patch: Partial<TreeSlice>): void;
  /** Space adds to the selection instead of replacing it. */
  multiple(): boolean;
  loadChildren(): TreeChildrenLoader | null | undefined;
  labels(): TreeviewLabels;
  announce(text: string): void;
  /** A row was chosen by click, Space or Enter. */
  select(node: TreeNode, additive: boolean): void;
  /** A row click before the default (select, then toggle a folder); true consumes it. */
  click?(node: TreeNode, target: Element): boolean;
  expanded(change: TreeExpansion): void;
  loadFailed(node: TreeNode, error: unknown): void;
}

export interface TreeController {
  expand(node: TreeNode): void;
  collapse(node: TreeNode): void;
  /** Moves focus to the tree's tab stop (the focused row, else the first). */
  focusStop(): boolean;
  detach(): void;
}

export function attachTreeController(o: TreeControllerOptions): TreeController {
  const tree = () => {
    const nodes = o.nodes();
    return { nodes, index: indexTree(nodes) };
  };
  /** Our own row (not a nested tree's in a node template). */
  const rowOf = (target: EventTarget | null): HTMLElement | null => {
    const row = (target as Element | null)?.closest?.<HTMLElement>('[role="treeitem"]') ?? null;
    return row && row.parentElement === o.list() ? row : null;
  };
  const rowFor = (nodeId: string) =>
    [...(o.list()?.children ?? [])].find((el) => el.getAttribute('data-node-id') === nodeId) as HTMLElement | undefined;

  const focusNode = (nodeId: string) => {
    o.patch({ focusedId: nodeId });
    // The target row is always rendered already (keys only move to visible
    // rows); a tabindex=-1 row takes focus, and the re-render moves the stop.
    rowFor(nodeId)?.focus();
  };

  const expand = (node: TreeNode) => {
    const s = o.slice();
    if (!isExpandable(node) || s.expandedIds.includes(node.id)) return;
    // Already loading: the load's own resolution expands the node.
    if (s.loadingIds.includes(node.id)) return;
    const loader = o.loadChildren();
    if (!hasChildren(node) && node.lazy && loader) {
      const { [node.id]: _, ...errors } = s.errors;
      o.patch({ loadingIds: [...s.loadingIds, node.id], errors });
      o.announce(treeviewLabel(o.labels().loading, { label: node.label }));
      void loader(node.id).then(
        (children) => {
          const list = children ?? [];
          const st = o.slice();
          const expandedIds = [...st.expandedIds, node.id];
          o.patch({
            loadingIds: st.loadingIds.filter((id) => id !== node.id),
            loaded: { ...st.loaded, [node.id]: list },
            expandedIds,
          });
          o.announce(treeviewLabel(o.labels().loaded, { label: node.label, count: list.length }));
          o.expanded({ type: 'expand', node, expandedIds, loadedChildren: list });
        },
        (error: unknown) => {
          const st = o.slice();
          o.patch({
            loadingIds: st.loadingIds.filter((id) => id !== node.id),
            errors: { ...st.errors, [node.id]: error instanceof Error ? error.message : String(error) },
          });
          o.announce(treeviewLabel(o.labels().loadFailed, { label: node.label }));
          o.loadFailed(node, error);
        },
      );
      return;
    }
    const expandedIds = [...s.expandedIds, node.id];
    o.patch({ expandedIds });
    o.expanded({ type: 'expand', node, expandedIds });
  };

  const collapse = (node: TreeNode) => {
    const before = o.slice().expandedIds;
    if (!before.includes(node.id)) return;
    const expandedIds = before.filter((id) => id !== node.id);
    o.patch({ expandedIds });
    o.expanded({ type: 'collapse', node, expandedIds });
  };

  const toggle = (node: TreeNode) => (o.slice().expandedIds.includes(node.id) ? collapse(node) : expand(node));

  const onClick = (ev: MouseEvent) => {
    const row = rowOf(ev.target);
    if (!row) return;
    const node = tree().index.byId.get(row.getAttribute('data-node-id') ?? '');
    if (!node) return;
    focusNode(node.id);
    const target = ev.target as Element;
    const chevron = target.closest('[data-tree-chevron]');
    if (chevron && row.contains(chevron)) {
      // The chevron only expands; it honours lazy nodes, which a row click does not.
      toggle(node);
      return;
    }
    if (o.click?.(node, target)) return;
    o.select(node, ev.ctrlKey || ev.metaKey);
    // A folder row also toggles, like an OS file manager.
    if (hasChildren(node)) toggle(node);
  };

  const onKeydown = (ev: KeyboardEvent) => {
    // Only keys pressed on the row itself: a node template's own inputs keep their arrows.
    const row = rowOf(ev.target);
    if (!row || ev.target !== row) return;
    const { nodes, index } = tree();
    const node = index.byId.get(row.getAttribute('data-node-id') ?? '');
    if (!node) return;
    const expanded = new Set(o.slice().expandedIds);
    const rtl = getComputedStyle?.(o.root).direction === 'rtl';
    const action = treeKeyAction(ev.key, {
      node,
      expanded,
      visible: visibleOrder(nodes, expanded),
      index,
      multiple: o.multiple(),
      rtl,
    });
    if (!action) return;
    ev.preventDefault();
    switch (action.type) {
      case 'focus':
        if (action.id !== node.id) focusNode(action.id);
        return;
      case 'expand':
        return expand(node);
      case 'collapse':
        return collapse(node);
      case 'activate':
        o.select(node, false);
        if (action.toggle) toggle(node);
        return;
      case 'select':
        return o.select(node, action.additive);
    }
  };

  o.root.addEventListener('click', onClick);
  o.root.addEventListener('keydown', onKeydown);
  return {
    expand,
    collapse,
    focusStop: () => {
      const stop = o.list()?.querySelector<HTMLElement>(':scope > [role="treeitem"][tabindex="0"]');
      stop?.focus();
      return !!stop;
    },
    detach: () => {
      o.root.removeEventListener('click', onClick);
      o.root.removeEventListener('keydown', onKeydown);
    },
  };
}
