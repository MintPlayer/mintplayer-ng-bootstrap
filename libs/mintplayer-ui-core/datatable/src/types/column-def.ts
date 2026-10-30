import type { FilterInputType, FilterMode, FilterOperator } from './filter';

/**
 * A column is data, not markup (#437): what a cell, a header or a filter panel
 * shows is front-native consumer content passed through the datatable's
 * `cell`, `header` and `filter` slots (Angular `*bsDatatableCell`, React
 * render props, Vue scoped slots, Lit `cellRenderer` & co).
 */

export type RowKey<T = unknown> = (row: T, rowIndex: number) => string;

/**
 * Per-row context: tree-mode metadata passed alongside the row. In flat mode
 * every field is its trivial default (depth 0, not expanded, not a placeholder).
 */
export interface RowRenderContext {
  depth: number;
  isExpanded: boolean;
  isPlaceholder: boolean;
}

export interface DatatableColumnDef<T = unknown> {
  /** Data property name + sort key. */
  name: string;
  /**
   * Header text, and the column's name in every generated accessible string:
   * resize handle, filter trigger and panel, sort and filter announcements.
   * Defaults to `name`. Set it whenever a `header` slot renders something
   * other than plain text (an icon), so the column still has a spoken name.
   */
  label?: string;
  /** Whether the header is clickable to toggle sort. Default `true`. */
  sortable?: boolean;
  /**
   * Whether this column offers a resize handle. Absent follows the table-wide
   * `resizableColumns`; a set value wins over it in either direction.
   */
  resizable?: boolean;
  /** Initial pinned width in px. Resizable columns can override at runtime. */
  width?: number;
  /** The default cell text; defaults to `String(row[name] ?? '')`. A `cell` slot replaces it. */
  format?: (row: T, rowIndex: number) => string;
  /** Forwarded to the cell as `class` attribute. */
  cellClass?: string;
  /**
   * Opt this column into the filter row. Default `false`: adding the row is a
   * visible change to the table. The row exists only when a column sets this.
   */
  filterable?: boolean;
  /**
   * Short description of the active filter, rendered on the trigger and folded
   * into its accessible name. Consumer-owned: never derived from a selection.
   * Whether the column is filtered at all follows the `filters` model.
   */
  filterSummary?: string;
  /**
   * Which question the built-in panel asks: a checkbox list of distinct values
   * (default) or an operator plus one operand. A `filter` slot replaces the panel.
   */
  filterMode?: FilterMode;
  /**
   * `type` of the operand input in `'comparison'` mode. Default `'number'`; also
   * decides parsing and the operand's encoding (`DatatableFilter`). `'datetime'`
   * edits local time and sends the UTC instant.
   */
  filterInputType?: FilterInputType;
  /** Operators offered in `'comparison'` mode, in the order shown. Defaults to all six. */
  filterOperators?: FilterOperator[];
}
