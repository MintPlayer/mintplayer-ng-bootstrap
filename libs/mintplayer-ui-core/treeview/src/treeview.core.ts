import { Announcer } from '@mintplayer/ui-core/announce';
import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { hasChildren, indexTree, isExpandable, treeKeyAction, visibleOrder, type TreeNode } from '@mintplayer/ui-core/tree';
import {
  TREEVIEW_LABELS,
  connectTreeview,
  mergeLoaded,
  parseSelectionMode,
  treeviewLabel,
  type IconResolver,
  type TreeChildrenLoader,
  type TreeNodeCollapseEventDetail,
  type TreeNodeExpandEventDetail,
  type TreeNodeLoadErrorEventDetail,
  type TreeNodeSelectEventDetail,
  type TreeviewIds,
  type TreeviewLabels,
  type TreeviewSelectionMode,
  type TreeviewView,
} from './treeview';

/**
 * The treeview's core (PRD #437 D10): what the generated Angular, React, Vue
 * and Lit components host. `treeview.component.ts` is their manifest and
 * `templates/treeview.view.vue` their markup.
 *
 * The rows are flat and complete on the server (every expanded level), so a
 * no-JS render shows the tree as it is; JS adds the roving tab stop, keys,
 * selection, expansion and lazy loads, all by delegation on the root.
 */
export interface TreeviewInputs {
  items: readonly TreeNode[];
  /** Ids of the expanded nodes. Two-way. */
  expandedIds: readonly string[];
  /** Ids of the selected nodes. Two-way. */
  selectedIds: readonly string[];
  selectionMode: TreeviewSelectionMode;
  /** Drops the outer border and the row separators. */
  hideBorders: boolean;
  iconResolver?: IconResolver | null;
  loadChildren?: TreeChildrenLoader | null;
  /** The tree's accessible name; an `aria-label` on the component wins. */
  inputLabel: string | null;
  /** Lazy-load announcements, for translation. */
  labels?: Partial<TreeviewLabels> | null;
}

export interface TreeviewState {
  expandedIds: readonly string[];
  selectedIds: readonly string[];
  focusedId: string | null;
  loadingIds: readonly string[];
  errors: Readonly<Record<string, string>>;
  /** Children a lazy node's loader resolved, until the consumer's items carry them. */
  loaded: Readonly<Record<string, readonly TreeNode[]>>;
  announcement: string;
}

export interface TreeviewEvents {
  nodeSelect: TreeNodeSelectEventDetail;
  nodeExpand: TreeNodeExpandEventDetail;
  nodeCollapse: TreeNodeCollapseEventDetail;
  nodeLoadError: TreeNodeLoadErrorEventDetail;
  selectedIdsChange: TreeviewIds;
  expandedIdsChange: TreeviewIds;
}

type Api = CoreApi<TreeviewInputs, TreeviewState, TreeviewEvents>;

const nodesOf = (inputs: Readonly<TreeviewInputs>, state: Readonly<TreeviewState>) => mergeLoaded(inputs.items ?? [], state.loaded);

/**
 * A selection that fits the mode: single keeps one. 'none' only stops the user
 * selecting; ids set from outside still mark their rows (tree-select's checked
 * rows), without aria-selected.
 */
function fitSelection(ids: readonly string[], mode: TreeviewSelectionMode): readonly string[] {
  return mode === 'single' && ids.length > 1 ? ids.slice(0, 1) : ids;
}

export const treeviewCore = defineCore<TreeviewInputs, TreeviewState, { view: TreeviewView }, TreeviewEvents>({
  state: (inputs) => ({
    expandedIds: inputs.expandedIds ?? [],
    selectedIds: fitSelection(inputs.selectedIds ?? [], parseSelectionMode(inputs.selectionMode)),
    focusedId: null,
    loadingIds: [],
    errors: {},
    loaded: {},
    announcement: '',
  }),
  view: ({ inputs, state, id, label }) => {
    const nodes = nodesOf(inputs, state);
    const known = indexTree(nodes).byId;
    return {
      view: connectTreeview({
        id,
        nodes,
        expanded: new Set(state.expandedIds),
        selected: new Set(state.selectedIds),
        mode: parseSelectionMode(inputs.selectionMode),
        // A focused node that left the tree hands the tab stop back to the first row.
        focusedId: state.focusedId !== null && known.has(state.focusedId) ? state.focusedId : null,
        loading: new Set(state.loadingIds),
        errors: state.errors,
        hideBorders: !!inputs.hideBorders,
        label: label ?? inputs.inputLabel ?? null,
        iconResolver: inputs.iconResolver,
        announcement: state.announcement,
      }),
    };
  },
  attach: (api) => {
    const root = api.host;
    const mode = () => parseSelectionMode(api.inputs().selectionMode);
    const labels = () => ({ ...TREEVIEW_LABELS, ...(api.inputs().labels ?? {}) });
    const tree = () => {
      const nodes = nodesOf(api.inputs(), api.state());
      return { nodes, index: indexTree(nodes) };
    };
    const announcer = new Announcer();
    const unsubscribe = announcer.subscribe((s) => api.setState({ announcement: s.text }));

    /** Our own row (not a nested treeview's in a node template): root > ul > li. */
    const rowOf = (target: EventTarget | null): HTMLElement | null => {
      const row = (target as Element | null)?.closest?.<HTMLElement>('[role="treeitem"]') ?? null;
      return row && row.parentElement?.parentElement === root ? row : null;
    };
    const rowFor = (nodeId: string) =>
      [...(root.querySelector(':scope > ul')?.children ?? [])].find((el) => el.getAttribute('data-node-id') === nodeId) as
        | HTMLElement
        | undefined;

    const focusNode = (nodeId: string) => {
      api.setState({ focusedId: nodeId });
      // The target row is always rendered already (keys only move to visible
      // rows); a tabindex=-1 row takes focus, and the re-render moves the stop.
      rowFor(nodeId)?.focus();
    };

    const select = (node: TreeNode, additive: boolean) => {
      const m = mode();
      if (m === 'none') return;
      const before = api.state().selectedIds;
      const next =
        m === 'multiple' && additive
          ? before.includes(node.id)
            ? before.filter((id) => id !== node.id)
            : [...before, node.id]
          : [node.id];
      api.setState({ selectedIds: next });
      api.emit('selectedIdsChange', [...next]);
      api.emit('nodeSelect', { node, selectedIds: [...next] });
    };

    const setExpanded = (next: readonly string[]) => {
      api.setState({ expandedIds: next });
      api.emit('expandedIdsChange', [...next]);
    };

    const expand = (node: TreeNode) => {
      const s = api.state();
      if (!isExpandable(node) || s.expandedIds.includes(node.id)) return;
      // Already loading: the load's own resolution expands the node.
      if (s.loadingIds.includes(node.id)) return;
      const loader = api.inputs().loadChildren;
      if (!hasChildren(node) && node.lazy && loader) {
        const { [node.id]: _, ...errors } = s.errors;
        api.setState({ loadingIds: [...s.loadingIds, node.id], errors });
        announcer.announce(treeviewLabel(labels().loading, { label: node.label }));
        void loader(node.id).then(
          (children) => {
            const list = children ?? [];
            const st = api.state();
            api.setState({
              loadingIds: st.loadingIds.filter((id) => id !== node.id),
              loaded: { ...st.loaded, [node.id]: list },
            });
            announcer.announce(treeviewLabel(labels().loaded, { label: node.label, count: list.length }));
            const next = [...api.state().expandedIds, node.id];
            setExpanded(next);
            api.emit('nodeExpand', { node, expandedIds: next, loadedChildren: list });
          },
          (error: unknown) => {
            const st = api.state();
            api.setState({
              loadingIds: st.loadingIds.filter((id) => id !== node.id),
              errors: { ...st.errors, [node.id]: error instanceof Error ? error.message : String(error) },
            });
            announcer.announce(treeviewLabel(labels().loadFailed, { label: node.label }));
            api.emit('nodeLoadError', { node, error });
          },
        );
        return;
      }
      const next = [...s.expandedIds, node.id];
      setExpanded(next);
      api.emit('nodeExpand', { node, expandedIds: next });
    };

    const collapse = (node: TreeNode) => {
      const before = api.state().expandedIds;
      if (!before.includes(node.id)) return;
      const next = before.filter((id) => id !== node.id);
      setExpanded(next);
      api.emit('nodeCollapse', { node, expandedIds: next });
    };

    const toggle = (node: TreeNode) => (api.state().expandedIds.includes(node.id) ? collapse(node) : expand(node));

    const onClick = (ev: MouseEvent) => {
      const row = rowOf(ev.target);
      if (!row) return;
      const node = tree().index.byId.get(row.getAttribute('data-node-id') ?? '');
      if (!node) return;
      focusNode(node.id);
      const chevron = (ev.target as Element).closest('[data-tree-chevron]');
      if (chevron && row.contains(chevron)) {
        // The chevron only expands; it honours lazy nodes, which a row click does not.
        toggle(node);
        return;
      }
      select(node, ev.ctrlKey || ev.metaKey);
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
      const expanded = new Set(api.state().expandedIds);
      const rtl = getComputedStyle?.(root).direction === 'rtl';
      const action = treeKeyAction(ev.key, {
        node,
        expanded,
        visible: visibleOrder(nodes, expanded),
        index,
        multiple: mode() === 'multiple',
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
          select(node, false);
          if (action.toggle) toggle(node);
          return;
        case 'select':
          return select(node, action.additive);
      }
    };

    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeydown);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
      unsubscribe();
      announcer.destroy();
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    const state = api.state();
    if (inputs.expandedIds !== prev.expandedIds && inputs.expandedIds !== state.expandedIds) {
      api.setState({ expandedIds: inputs.expandedIds ?? [] });
    }
    const m = parseSelectionMode(inputs.selectionMode);
    if (inputs.selectedIds !== prev.selectedIds && inputs.selectedIds !== state.selectedIds) {
      api.setState({ selectedIds: fitSelection(inputs.selectedIds ?? [], m) });
    } else if (inputs.selectionMode !== prev.selectionMode) {
      const fitted = fitSelection(state.selectedIds, m);
      if (fitted !== state.selectedIds) {
        api.setState({ selectedIds: fitted });
        api.emit('selectedIdsChange', [...fitted]);
      }
    }
  },
});
