import type { ReactiveControllerHost } from 'lit';
import type { TreeNode } from '../types';

/** Minimal handle the WC needs from a registered sortable implementation. */
export interface TreeSelectSortableHandle {
  /** Wire pointer/keyboard reordering to the element containing the chips. Idempotent. */
  attach(container: Element): void;
}

/** Options the WC hands the factory when it wants to enable chip reordering. */
export interface TreeSelectSortableOptions {
  items: () => readonly TreeNode[];
  itemId: (node: TreeNode) => string;
  onDrop: (event: { previousIndex: number; currentIndex: number }) => void;
  label?: (node: TreeNode) => string;
  announce?: (message: string) => void;
}

export type TreeSelectSortableFactory = (
  host: ReactiveControllerHost & HTMLElement,
  options: TreeSelectSortableOptions,
) => TreeSelectSortableHandle;

/**
 * Registration seam that keeps the drag-drop code out of the base bundle. The
 * base `<mp-tree-select>` imports only `getTreeSelectSortable()` (a getter — no
 * drag code). The heavy `SortableController` is reachable only after a consumer
 * opts in by importing an artifact that calls `registerTreeSelectSortable(...)`
 * (e.g. `@mintplayer/web-components/tree-select-reorder` or the Angular
 * `BsTreeSelectReorderDirective`). With nothing registered, `reorderable` is
 * inert — so tree-shaking can drop the whole drag-drop module for consumers that
 * never reorder.
 */
let factory: TreeSelectSortableFactory | undefined;

export function registerTreeSelectSortable(register: TreeSelectSortableFactory): void {
  factory = register;
}

export function getTreeSelectSortable(): TreeSelectSortableFactory | undefined {
  return factory;
}
