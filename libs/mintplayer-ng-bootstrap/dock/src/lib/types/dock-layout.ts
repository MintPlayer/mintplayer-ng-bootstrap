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

export interface DockFloatingPaneBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DockFloatingStackLayout {
  /**
   * Optional developer supplied identifier that can be used to recognize a floating pane instance.
   */
  id?: string;
  /**
   * Absolute coordinates (in CSS pixels) describing where the floating pane should appear.
   */
  bounds: DockFloatingPaneBounds;
  /**
   * Optional z-index override for the floating pane body. Higher values appear above lower ones.
   */
  zIndex?: number;
  /**
   * Root layout rendered inside the floating window.
   */
  root: DockLayoutNode | null;
  /**
   * Pane that should surface in the floating window header.
   */
  activePane?: string;
  /**
   * @deprecated Legacy support for snapshots created before floating windows supported nested layouts.
   */
  panes?: string[];
  /**
   * @deprecated Legacy support for snapshots created before floating windows supported nested layouts.
   */
  titles?: Record<string, string>;
}

export interface DockLayout {
  root: DockLayoutNode | null;
  floating?: DockFloatingStackLayout[];
}

export interface DockLayoutSnapshot {
  root: DockLayoutNode | null;
  floating: DockFloatingStackLayout[];
}
