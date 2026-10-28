import { Announcer } from '@mintplayer/ui-core/announce';
import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { indexTree, type TreeNode } from '@mintplayer/ui-core/tree';
import { attachTreeController } from './tree-controller';
import {
  TREEVIEW_LABELS,
  connectTreeview,
  mergeLoaded,
  parseSelectionMode,
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
    const announcer = new Announcer();
    const unsubscribe = announcer.subscribe((s) => api.setState({ announcement: s.text }));

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

    const controller = attachTreeController({
      root,
      list: () => root.querySelector(':scope > ul'),
      nodes: () => nodesOf(api.inputs(), api.state()),
      slice: () => api.state(),
      patch: (patch) => api.setState(patch),
      multiple: () => mode() === 'multiple',
      loadChildren: () => api.inputs().loadChildren,
      labels: () => ({ ...TREEVIEW_LABELS, ...(api.inputs().labels ?? {}) }),
      announce: (text) => announcer.announce(text),
      select,
      expanded: (change) => {
        api.emit('expandedIdsChange', [...change.expandedIds]);
        if (change.type === 'collapse') api.emit('nodeCollapse', { node: change.node, expandedIds: [...change.expandedIds] });
        else
          api.emit('nodeExpand', {
            node: change.node,
            expandedIds: [...change.expandedIds],
            ...(change.loadedChildren ? { loadedChildren: [...change.loadedChildren] } : {}),
          });
      },
      loadFailed: (node, error) => api.emit('nodeLoadError', { node, error }),
    });

    return () => {
      controller.detach();
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
