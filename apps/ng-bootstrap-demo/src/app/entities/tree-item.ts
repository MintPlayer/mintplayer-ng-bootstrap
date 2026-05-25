/**
 * One row in the tree-mode datatable demo. Matches the apps/api
 * `TreeItemDto` shape; `parentId` is null for roots, `childCount` drives the
 * chevron visibility AND the placeholder reservation in virtual scroll.
 */
export interface TreeItem {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  headcount: number;
  childCount: number;
}
