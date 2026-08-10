/**
 * Shared data models for the charts/ family. Framework-agnostic, DOM-free.
 */

export interface HierarchyNode {
  /** Stable identity — keyed rendering, focus restore and lazy loading all rely on it. */
  id: string;
  name: string;
  /**
   * Weight of a leaf (e.g. line count). On a node with loaded children the
   * rollup uses the children's sum instead and this value is ignored.
   */
  value?: number;
  /** Metric mapped through the chart's color scale (e.g. coverage %). */
  colorValue?: number;
  /** Explicit fill; wins over colorValue. */
  color?: string;
  /** Marks a node whose children exist but are not loaded yet (lazy loading). */
  hasChildren?: boolean;
  children?: HierarchyNode[];
}

export interface TrendPoint {
  x: number | Date;
  /** null renders a gap; forward-filling is the consumer's choice. */
  y: number | null;
}

export interface TrendSeries {
  id: string;
  label: string;
  color?: string;
  points: TrendPoint[];
}

export interface HierarchyNodeEventDetail {
  node: HierarchyNode;
  /** Ancestors from the data root down to (and including) the node. */
  path: HierarchyNode[];
}

export interface HierarchyHoverEventDetail {
  node: HierarchyNode | null;
  path: HierarchyNode[];
}

export interface HierarchyLoadErrorEventDetail {
  node: HierarchyNode;
  error: unknown;
}

export interface TrendPointEventDetail {
  seriesId: string;
  point: TrendPoint;
}

export interface TrendHoverEventDetail {
  seriesId: string | null;
  point: TrendPoint | null;
}
