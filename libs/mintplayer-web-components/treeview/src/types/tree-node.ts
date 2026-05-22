export interface TreeNode {
  id: string;
  label: string;
  iconKey?: string;
  children?: TreeNode[];
  /**
   * Marks this node as lazy: shows the expand chevron even when no
   * `children` are present, so `loadChildren` can be invoked on first
   * expansion. Defaults to `false`. Once children are populated, the
   * node behaves like a normal expandable node.
   */
  lazy?: boolean;
  meta?: Record<string, unknown>;
}
