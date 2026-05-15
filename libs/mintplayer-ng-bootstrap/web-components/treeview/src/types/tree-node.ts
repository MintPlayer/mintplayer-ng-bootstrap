export interface TreeNode {
  id: string;
  label: string;
  iconKey?: string;
  children?: TreeNode[];
  meta?: Record<string, unknown>;
}
