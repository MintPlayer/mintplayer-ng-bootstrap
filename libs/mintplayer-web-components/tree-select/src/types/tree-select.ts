import type { TreeNode } from '@mintplayer/web-components/treeview';

/**
 * Selection arity / affordance.
 * - `single`   — one node; `value` is a scalar `TreeNode | null`.
 * - `multiple` — many nodes shown as chips; `value` is a `TreeNode[]`.
 * - `checkbox` — many nodes with a checkbox per row; `value` is a `TreeNode[]`.
 *                Pair with `cascadeSelect` for parent/child propagation.
 */
export type TreeSelectMode = 'single' | 'multiple' | 'checkbox';

/**
 * Trigger shape.
 * - `textbox` — an inline search input that opens the panel (select2-style).
 * - `button`  — a button that opens a panel containing the search box.
 */
export type TreeSelectVariant = 'textbox' | 'button';

/** A page of nodes returned by the {@link TreeSelectProvider}. */
export interface NodePage {
  nodes: TreeNode[];
  /** `true` when more rows exist beyond this page (drives "load more"). */
  hasMore?: boolean;
}

/** Per-call request metadata handed to every provider method. */
export interface NodeRequest {
  /** Cursor for paging — number of rows already loaded for this list. */
  offset?: number;
  /** Aborts when a newer request supersedes this one (stale-search guard). */
  signal: AbortSignal;
}

/**
 * The single external data port. Data is async-only — there is no static
 * `items` input. Each method is abortable and paged.
 *
 * - `loadRoots`    — top-level nodes (called on first open / "load more" root).
 * - `search`       — server-side search across the whole tree for `query`.
 * - `loadChildren` — lazy children of an expandable node (`ChildCount > 0`).
 */
export interface TreeSelectProvider {
  loadRoots(req: NodeRequest): Promise<NodePage>;
  search(query: string, req: NodeRequest): Promise<NodePage>;
  loadChildren(parentId: string, req: NodeRequest): Promise<NodePage>;
}

/** Detail of the `value-change` event. */
export interface TreeSelectChangeEventDetail {
  /** Scalar in `single` mode, array otherwise. */
  value: TreeNode | TreeNode[] | null;
  /** The node toggled on, when this change added one. */
  added?: TreeNode;
  /** The node toggled off, when this change removed one. */
  removed?: TreeNode;
}

export type { TreeNode };
