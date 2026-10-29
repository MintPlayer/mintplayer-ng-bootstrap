import type { CoreBag } from '@mintplayer/ui-core/component';
import { indexTree, type TreeIndex, type TreeNode } from '@mintplayer/ui-core/tree';
import { connectTreeview, type TreeSlice, type TreeviewRow, type TreeviewView } from '@mintplayer/ui-core/treeview';
import { hydratedAttr } from '@mintplayer/ui-core/store';
import type { TreeSelectMode, TreeSelectVariant } from './types';

/**
 * The tree-select, framework-neutral (PRD #437): a combobox (or a button)
 * that opens a native `popover` holding a search box and a tree. The tree is
 * the treeview's markup, from `connectTreeview()`, driven by the treeview's
 * controller over a slice of this core's state (D2 (a)): the tree-select only
 * decides what choosing a row means.
 *
 * Multiple and checkbox modes are a multi-select tree: `multiple` marks the
 * chosen rows `aria-selected`, `checkbox` marks them `aria-checked` (with
 * `mixed` for a partly chosen branch under `cascadeSelect`). The check glyph
 * is decorative; no input sits inside a treeitem.
 */

export const TREE_SELECT_SCOPE = 'tree-select';

export type TreeSelectBag = CoreBag;

/** Scalar in `single` mode, an array otherwise. */
export type TreeSelectValue = TreeNode | TreeNode[] | null;

export interface TreeSelectLabels {
  /** The search box's name, and the combobox's when nothing else names it. */
  search: string;
  clear: string;
  /** A chip's remove button; `{label}` is the node's label. */
  remove: string;
  selected: string;
  removed: string;
  cleared: string;
  /** The result count after a search; `{count}` is the count. */
  results: string;
  oneResult: string;
  noResults: string;
  noItems: string;
  noProvider: string;
  loadMore: string;
}

export const TREE_SELECT_LABELS: TreeSelectLabels = {
  search: 'Search',
  clear: 'Clear',
  remove: 'Remove {label}',
  selected: '{label} selected.',
  removed: '{label} removed.',
  cleared: 'Selection cleared.',
  results: '{count} results.',
  oneResult: '1 result.',
  noResults: 'No results',
  noItems: 'No items',
  noProvider: 'No data provider',
  loadMore: 'Load more',
};

export const parseTreeSelectMode = (v: string | null | undefined): TreeSelectMode =>
  v === 'multiple' || v === 'checkbox' ? v : 'single';
export const parseTreeSelectVariant = (v: string | null | undefined): TreeSelectVariant => (v === 'button' ? 'button' : 'textbox');

/** The value as a list, whatever the mode. */
export const valueList = (value: TreeSelectValue | undefined): TreeNode[] =>
  Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

/** The list as the mode's value: one node or null in single mode. */
export const valueFor = (mode: TreeSelectMode, list: readonly TreeNode[]): TreeSelectValue =>
  mode === 'single' ? (list[0] ?? null) : [...list];

const descendantsOf = (node: TreeNode): TreeNode[] => [node, ...(node.children ?? []).flatMap(descendantsOf)];

/**
 * Checks or unchecks a node with its LOADED descendants, then rolls the change
 * up: an ancestor is chosen exactly when all its loaded children are.
 */
export function cascade(list: readonly TreeNode[], node: TreeNode, checked: boolean, index: TreeIndex): TreeNode[] {
  const down = new Set(descendantsOf(node).map((n) => n.id));
  const kept = list.filter((n) => !down.has(n.id));
  const afterDown = checked ? [...kept, ...descendantsOf(node)] : kept;
  const rollUp = (nodes: TreeNode[], child: TreeNode): TreeNode[] => {
    const parent = index.parentById.get(child.id) ?? null;
    if (!parent) return nodes;
    const ids = new Set(nodes.map((n) => n.id));
    const all = (parent.children ?? []).length > 0 && (parent.children ?? []).every((c) => ids.has(c.id));
    const without = nodes.filter((n) => n.id !== parent.id);
    return rollUp(all ? [...without, parent] : without, parent);
  };
  return rollUp(afterDown, node);
}

/** Not chosen, but with a chosen loaded descendant. */
export function indeterminateIds(nodes: readonly TreeNode[], chosen: ReadonlySet<string>): Set<string> {
  const visit = (node: TreeNode): string[] => {
    const below = (node.children ?? []).flatMap(visit);
    const childChosen = (node.children ?? []).some((c) => chosen.has(c.id) || below.includes(c.id));
    return [...below, ...(!chosen.has(node.id) && childChosen ? [node.id] : [])];
  };
  return new Set(nodes.flatMap(visit));
}

export interface TreeSelectChip {
  readonly key: string;
  readonly node: TreeNode;
  readonly bag: TreeSelectBag;
  /** The remove button; none inside the button variant's trigger, which is itself a button. */
  readonly remove: TreeSelectBag | null;
}

export interface TreeSelectRow extends TreeviewRow {
  /** The decorative check glyph in multiple and checkbox modes. */
  readonly check: TreeSelectBag | null;
}

export interface TreeSelectView {
  readonly root: TreeSelectBag;
  readonly live: TreeSelectBag;
  readonly announcement: string;
  readonly textbox: boolean;
  /** The textbox variant's anchor. */
  readonly control: TreeSelectBag;
  readonly input: TreeSelectBag;
  /** The button variant's trigger and its body. */
  readonly button: TreeSelectBag;
  readonly buttonBody: TreeSelectBag;
  readonly placeholder: TreeSelectBag;
  readonly placeholderText: string;
  readonly showPlaceholder: boolean;
  readonly chips: readonly TreeSelectChip[];
  readonly chipLabel: TreeSelectBag;
  /** The chosen node in single mode, shown while nothing is typed. */
  readonly single: TreeNode | null;
  readonly singleBag: TreeSelectBag;
  readonly clear: TreeSelectBag | null;
  readonly caret: TreeSelectBag;
  readonly panel: TreeSelectBag;
  readonly header: TreeSelectBag;
  readonly footer: TreeSelectBag;
  /** The button variant's search box, inside the panel. */
  readonly panelSearch: TreeSelectBag | null;
  readonly body: TreeSelectBag;
  readonly bodyStyle: Record<string, string>;
  readonly busy: boolean;
  readonly noResults: boolean;
  readonly noItems: boolean;
  readonly noProvider: boolean;
  readonly showTree: boolean;
  readonly stateBag: TreeSelectBag;
  readonly spinner: TreeSelectBag;
  readonly tree: TreeviewView;
  readonly rows: readonly TreeSelectRow[];
  readonly loadMore: TreeSelectBag | null;
  readonly loadMoreBusy: boolean;
  readonly loadMoreLabel: TreeSelectBag;
  readonly query: string;
  /** The value, for the button slot. */
  readonly value: TreeSelectValue;
  readonly labels: TreeSelectLabels;
}

export interface TreeSelectOptions {
  readonly id: string;
  readonly mode: TreeSelectMode;
  readonly variant: TreeSelectVariant;
  /** The core has attached: written as the readiness mark, never in server HTML. */
  readonly hydrated?: boolean;
  readonly value: readonly TreeNode[];
  /** The displayed nodes (search results or the browse tree), loaded children merged in. */
  readonly nodes: readonly TreeNode[];
  readonly tree: Readonly<TreeSlice>;
  readonly cascadeSelect: boolean;
  readonly query: string;
  readonly open: boolean;
  readonly loading: boolean;
  readonly hasProvider: boolean;
  /** Whether the displayed list has loaded at least once. */
  readonly loaded: boolean;
  readonly hasMore: boolean;
  readonly disabled: boolean;
  readonly placeholder: string;
  readonly showClear: boolean;
  readonly scrollHeight: string;
  readonly label: string | null;
  readonly announcement: string;
  readonly labels?: Partial<TreeSelectLabels>;
}

const scoped = (bag: TreeSelectBag): TreeSelectBag => ({ ...bag, 'data-mps': TREE_SELECT_SCOPE });

export const treeSelectPanelId = (id: string) => `${id}-panel`;
export const treeSelectTreeId = (id: string) => `${id}-tree`;

export function connectTreeSelect(o: TreeSelectOptions): TreeSelectView {
  const labels = { ...TREE_SELECT_LABELS, ...(o.labels ?? {}) };
  const fill = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (all, key: string) => (key in values ? String(values[key]) : all));
  const textbox = o.variant === 'textbox';
  const multi = o.mode !== 'single';
  const checkbox = o.mode === 'checkbox';
  const panelId = treeSelectPanelId(o.id);
  const treeId = treeSelectTreeId(o.id);
  const hasSelection = o.value.length > 0;
  const name = o.label ?? (o.placeholder || labels.search);
  const chosen = new Set(o.value.map((n) => n.id));
  const mixed = checkbox && o.cascadeSelect ? indeterminateIds(o.nodes, chosen) : new Set<string>();
  const known = indexTree(o.nodes).byId;

  const tree = connectTreeview({
    id: o.id,
    nodes: o.nodes,
    expanded: new Set(o.tree.expandedIds),
    selected: chosen,
    mode: multi ? 'multiple' : 'single',
    focusedId: o.tree.focusedId !== null && known.has(o.tree.focusedId) ? o.tree.focusedId : null,
    loading: new Set(o.tree.loadingIds),
    errors: o.tree.errors,
    hideBorders: true,
    label: name,
    announcement: '',
  });
  const stateOf = (id: string) => (chosen.has(id) ? 'checked' : mixed.has(id) ? 'mixed' : 'unchecked');
  const rows: TreeSelectRow[] = tree.rows.map((row) => ({
    ...row,
    // A checkbox tree speaks aria-checked (mixed for a partial branch), never both states.
    item: checkbox
      ? { ...row.item, 'aria-selected': null, 'aria-checked': stateOf(row.key) === 'checked' ? 'true' : stateOf(row.key) === 'mixed' ? 'mixed' : 'false' }
      : row.item,
    check: multi
      ? scoped({ class: 'ts-node-check', 'data-state': stateOf(row.key), 'data-ts-check': '', 'aria-hidden': 'true' })
      : null,
  }));

  const searching = !!o.query.trim();
  const busy = o.hasProvider && o.loading && !o.loaded;
  const empty = o.hasProvider && !busy && o.nodes.length === 0;
  const single = o.mode === 'single' ? (o.value[0] ?? null) : null;

  return {
    root: scoped({
      class: 'tree-select',
      'data-mode': o.mode,
      'data-variant': o.variant,
      'data-open': o.open ? 'true' : 'false',
      'data-disabled': o.disabled ? 'true' : 'false',
      ...hydratedAttr(o.hydrated ?? false),
    }),
    live: scoped({ class: 'visually-hidden', 'aria-live': 'polite', 'aria-atomic': 'true' }),
    announcement: o.announcement,
    textbox,
    control: scoped({ class: 'ts-control ts-anchor', 'data-ts-control': '' }),
    input: scoped({
      class: 'ts-search',
      type: 'text',
      role: 'combobox',
      autocomplete: 'off',
      'aria-haspopup': 'tree',
      'aria-expanded': o.open ? 'true' : 'false',
      'aria-controls': treeId,
      'aria-autocomplete': 'list',
      'aria-label': name,
      placeholder: hasSelection ? '' : o.placeholder,
      disabled: o.disabled,
      'data-ts-search': '',
    }),
    button: scoped({
      class: 'ts-button ts-anchor',
      type: 'button',
      popovertarget: panelId,
      'aria-haspopup': 'tree',
      'aria-expanded': o.open ? 'true' : 'false',
      'aria-controls': panelId,
      'aria-label': o.label,
      disabled: o.disabled,
    }),
    buttonBody: scoped({ class: 'ts-button-body' }),
    placeholder: scoped({ class: 'ts-placeholder' }),
    placeholderText: o.placeholder,
    showPlaceholder: !hasSelection,
    chips: multi
      ? o.value.map((node) => ({
          key: node.id,
          node,
          bag: scoped({ class: 'ts-chip' }),
          remove: textbox
            ? scoped({
                class: 'ts-chip-remove',
                type: 'button',
                'aria-label': fill(labels.remove, { label: node.label ?? '' }),
                'data-ts-remove': node.id,
              })
            : null,
        }))
      : [],
    chipLabel: scoped({ class: 'ts-chip-label' }),
    single: textbox && searching ? null : single,
    singleBag: scoped({ class: 'ts-single-value' }),
    clear:
      o.showClear && hasSelection && textbox
        ? scoped({ class: 'ts-clear', type: 'button', 'aria-label': labels.clear, 'data-ts-clear': '' })
        : null,
    caret: scoped({ class: 'ts-caret', 'aria-hidden': 'true' }),
    panel: scoped({
      class: 'ts-panel',
      id: panelId,
      popover: 'auto',
      role: textbox ? null : 'dialog',
      'aria-label': textbox ? null : name,
      'aria-busy': o.loading ? 'true' : null,
    }),
    header: scoped({ class: 'ts-panel-header' }),
    footer: scoped({ class: 'ts-panel-footer' }),
    panelSearch: textbox
      ? null
      : scoped({
          class: 'ts-search panel-search',
          type: 'text',
          autocomplete: 'off',
          placeholder: o.placeholder || labels.search,
          'aria-label': labels.search,
          'aria-controls': treeId,
          'data-ts-search': '',
        }),
    body: scoped({ class: 'ts-panel-body' }),
    bodyStyle: { '--mp-tree-select-panel-max-height': o.scrollHeight || '300px' },
    busy,
    noResults: empty && searching,
    noItems: empty && !searching,
    noProvider: !o.hasProvider,
    showTree: o.hasProvider && !busy && o.nodes.length > 0,
    stateBag: scoped({ class: 'ts-state' }),
    spinner: scoped({ class: 'ts-spinner', 'aria-hidden': 'true' }),
    // The treeview class names on the list carry its custom properties to the rows.
    tree: { ...tree, tree: { ...tree.tree, id: treeId, class: `treeview treeview-borderless ${tree.tree['class']}` } },
    rows,
    loadMore: o.hasMore ? scoped({ class: 'ts-load-more', type: 'button', 'data-ts-load-more': '' }) : null,
    loadMoreBusy: o.loading,
    loadMoreLabel: scoped({ class: 'ts-load-more-label' }),
    query: o.query,
    value: valueFor(o.mode, o.value),
    labels,
  };
}
