import type { CoreBag } from '@mintplayer/ui-core/component';
import { hasChildren, isExpandable, type TreeNode } from '@mintplayer/ui-core/tree';

/** The scope of the treeview's sheet: `[data-mps=treeview]`. */
export const TREEVIEW_SCOPE = 'treeview';

export type TreeviewSelectionMode = 'none' | 'single' | 'multiple';

/** Markup for a node's `iconKey` (an SVG string), or nothing. */
export type IconResolver = (iconKey: string, node: TreeNode) => string | undefined;

/**
 * Async loader for a lazy node's children, run the first time it expands.
 * Reject to show the per-node error indicator; expanding again retries.
 */
export type TreeChildrenLoader = (parentId: string) => Promise<TreeNode[]>;

/** What a `node` slot renders with, next to the node itself. */
export interface TreeNodeRenderContext {
  level: number;
  expanded: boolean;
  selected: boolean;
  focused: boolean;
  /** The node can expand: it has children, or loads them lazily. */
  hasChildren: boolean;
}

export interface TreeNodeSelectEventDetail {
  node: TreeNode;
  selectedIds: string[];
}

export interface TreeNodeExpandEventDetail {
  node: TreeNode;
  expandedIds: string[];
  /** A lazy node's children, as its loader resolved them. */
  loadedChildren?: TreeNode[];
}

export interface TreeNodeCollapseEventDetail {
  node: TreeNode;
  expandedIds: string[];
}

export interface TreeNodeLoadErrorEventDetail {
  node: TreeNode;
  error: unknown;
}

/** Announcements for lazy loads, which move no focus. `{label}` and `{count}` are filled in. */
export interface TreeviewLabels {
  loading: string;
  loaded: string;
  loadFailed: string;
}

export const TREEVIEW_LABELS: TreeviewLabels = {
  loading: 'Loading {label}.',
  loaded: '{label} loaded, {count} items.',
  loadFailed: 'Loading {label} failed.',
};

export function treeviewLabel(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (all, key: string) => (key in values ? String(values[key]) : all));
}

export type TreeviewBag = CoreBag;

/** Node ids, as the two-way `expandedIds` and `selectedIds` carry them. */
export type TreeviewIds = string[];

/** One visible node: its bags, and what its slot renders with. */
export interface TreeviewRow {
  readonly key: string;
  readonly node: TreeNode;
  readonly ctx: TreeNodeRenderContext;
  readonly item: TreeviewBag;
  /** The indent, as a custom property the sheet turns into padding. */
  readonly style: Record<string, string>;
  readonly chevron: TreeviewBag;
  readonly loading: boolean;
  /** The resolved icon markup, or null. */
  readonly icon: string | null;
  readonly error: string | null;
  readonly errorBag: TreeviewBag;
}

export interface TreeviewView {
  readonly root: TreeviewBag;
  readonly tree: TreeviewBag;
  readonly rows: readonly TreeviewRow[];
  readonly spinner: TreeviewBag;
  readonly body: TreeviewBag;
  readonly icon: TreeviewBag;
  readonly label: TreeviewBag;
  readonly live: TreeviewBag;
  readonly announcement: string;
}

export interface TreeviewOptions {
  /** Deterministic per instance: the rows' ids derive from it. */
  readonly id: string;
  /** The nodes, with lazily loaded children already merged in. */
  readonly nodes: readonly TreeNode[];
  readonly expanded: ReadonlySet<string>;
  readonly selected: ReadonlySet<string>;
  readonly mode: TreeviewSelectionMode;
  /** The row holding the roving tab stop; null puts it on the first row. */
  readonly focusedId: string | null;
  readonly loading: ReadonlySet<string>;
  readonly errors: Readonly<Record<string, string>>;
  readonly hideBorders: boolean;
  readonly label: string | null;
  readonly iconResolver?: IconResolver | null;
  readonly announcement: string;
}

export const parseSelectionMode = (v: string | null | undefined): TreeviewSelectionMode =>
  v === 'none' || v === 'multiple' ? v : 'single';

/** A node's children with a lazy load's result merged in, at every depth. */
export function mergeLoaded(nodes: readonly TreeNode[], loaded: Readonly<Record<string, readonly TreeNode[]>>): TreeNode[] {
  return nodes.map((node) => {
    const children = hasChildren(node) ? node.children : loaded[node.id];
    if (!children || children.length === 0) return node;
    const merged = mergeLoaded(children, loaded);
    return children === node.children && merged.every((n, k) => n === children[k]) ? node : { ...node, children: merged };
  });
}

/** The row's DOM id. */
export const treeviewRowId = (id: string, nodeId: string): string => `${id}-row-${nodeId}`;

/**
 * The treeview's bags. The rows are FLAT, in reading order: the APG tree
 * pattern allows a flat list of treeitems when each carries `aria-level`,
 * `aria-setsize` and `aria-posinset`, so no front needs a recursive template.
 */
export function connectTreeview(o: TreeviewOptions): TreeviewView {
  const first = o.nodes[0]?.id ?? null;
  const stop = o.focusedId ?? first;
  const rowsOf = (nodes: readonly TreeNode[], level: number): TreeviewRow[] =>
    nodes.flatMap((node, k) => {
      const expandable = isExpandable(node);
      const expanded = o.expanded.has(node.id);
      const selected = o.selected.has(node.id);
      const loading = o.loading.has(node.id);
      const error = o.errors[node.id] ?? null;
      const rowId = treeviewRowId(o.id, node.id);
      const row: TreeviewRow = {
        key: node.id,
        node,
        ctx: { level, expanded, selected, focused: node.id === stop, hasChildren: expandable },
        item: {
          id: rowId,
          class: 'treeview-row',
          role: 'treeitem',
          'data-node-id': node.id,
          'data-selected': selected ? 'true' : 'false',
          'data-loading': loading ? 'true' : 'false',
          'data-error': error ? 'true' : 'false',
          'aria-level': level,
          'aria-setsize': nodes.length,
          'aria-posinset': k + 1,
          'aria-expanded': expandable ? (expanded ? 'true' : 'false') : null,
          'aria-busy': loading ? 'true' : null,
          'aria-selected': o.mode === 'none' ? null : selected ? 'true' : 'false',
          'aria-describedby': error ? `${rowId}-error` : null,
          tabindex: node.id === stop ? 0 : -1,
        },
        style: { '--mp-treeview-level': String(level) },
        chevron: {
          class: `treeview-chevron${expandable ? '' : ' invisible'}${loading ? ' loading' : ''}`,
          'data-expanded': expanded ? 'true' : 'false',
          'data-tree-chevron': '',
          'aria-hidden': 'true',
        },
        loading,
        icon: (node.iconKey && o.iconResolver?.(node.iconKey, node)) || null,
        error,
        errorBag: { id: `${rowId}-error`, class: 'treeview-load-error' },
      };
      return [row, ...(hasChildren(node) && expanded ? rowsOf(node.children as TreeNode[], level + 1) : [])];
    });
  const rows = rowsOf(o.nodes, 1);

  return {
    root: { class: `treeview${o.hideBorders ? ' treeview-borderless' : ''}` },
    // A childless tree is invalid ARIA: the role appears once there are treeitems.
    tree: {
      class: 'treeview-tree',
      role: rows.length ? 'tree' : 'presentation',
      'aria-label': o.label,
      'aria-multiselectable': o.mode === 'multiple' ? 'true' : null,
    },
    rows,
    spinner: { class: 'treeview-spinner', 'aria-hidden': 'true' },
    body: { class: 'treeview-body' },
    icon: { class: 'treeview-icon', 'aria-hidden': 'true' },
    label: { class: 'treeview-label' },
    // Next to the tree, never inside it (aria-required-children). aria-live
    // alone announces; no role, so a host's own role=status stays the only one.
    live: { class: 'visually-hidden', 'aria-live': 'polite', 'aria-atomic': 'true' },
    announcement: o.announcement,
  };
}
