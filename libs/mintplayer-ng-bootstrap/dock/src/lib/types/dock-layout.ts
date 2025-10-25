export type DockLayoutNode = DockSplitNode | DockStackNode;

export interface DockSplitNode {
  kind: 'split';
  direction: 'horizontal' | 'vertical';
  /**
   * Relative sizes for the split children. Values do not need to sum to 100; they are treated as flex weights.
   */
  sizes?: number[];
  children: DockLayoutNode[];
}

export interface DockStackNode {
  kind: 'stack';
  /**
   * Unique pane names that should appear as tabs.
   */
  panes: string[];
  /**
   * Optional caption overrides for each pane.
   */
  titles?: Record<string, string>;
  /**
   * Optional pane name that should be active when the layout is rendered.
   */
  activePane?: string;
}

export interface DockLayoutSnapshot {
  root: DockLayoutNode | null;
}
