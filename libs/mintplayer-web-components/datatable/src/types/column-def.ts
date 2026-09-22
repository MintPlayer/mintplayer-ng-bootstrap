import type { TemplateResult } from 'lit';

export type CellContent = string | number | boolean | null | undefined | TemplateResult | Node;

export type CellRenderer<T = unknown> = (
  row: T,
  column: DatatableColumnDef<T>,
  rowIndex: number,
) => CellContent;

export type HeaderRenderer<T = unknown> = (
  column: DatatableColumnDef<T>,
) => CellContent;

export type RowKey<T = unknown> = (row: T, rowIndex: number) => string;

/**
 * Per-row renderer context — tree-mode metadata passed alongside the row.
 * In flat mode every field is its trivial default (depth 0, not expanded, not a placeholder).
 */
export interface RowRenderContext {
  depth: number;
  isExpanded: boolean;
  isPlaceholder: boolean;
}

/**
 * Per-row renderer. Returns the cell content for an entire row: either an
 * array of `Node`s (one `<td>` per data column, in column order) or a single
 * `Node` that already contains the cells.
 *
 * `row` is `undefined` for placeholder rows (tree-mode, children pending fetch).
 *
 * Used by the Angular wrapper to bridge `*bsRowTemplate` Angular templates
 * into the WC's shadow DOM via EmbeddedViewRef-managed nodes.
 */
export type RowRenderer<T = unknown> = (
  row: T | undefined,
  rowIndex: number,
  context?: RowRenderContext,
) => ReadonlyArray<Node> | Node | undefined;

/**
 * Contents of a column's filter panel. Like every other renderer here, it is a
 * plain function returning a DOM `Node` — the component appends it and never
 * asks where it came from, so React/Vue pass one directly and the Angular
 * wrapper bridges an `ng-template` through an `EmbeddedViewRef`.
 *
 * The returned node is the CONSUMER's DOM: it is never stamped with this
 * component's style scope, and none of its rules reach inside.
 */
export type FilterRenderer<T = unknown> = (column: DatatableColumnDef<T>) => Node;

export interface DatatableColumnDef<T = unknown> {
  /** Data property name + sort key. */
  name: string;
  /** Header label (rendered when no `headerRenderer` is provided). */
  label?: string;
  /** Whether the header is clickable to toggle sort. Default `true`. */
  sortable?: boolean;
  /** Initial pinned width in px. Resizable columns can override at runtime. */
  width?: number;
  /** Cell renderer; defaults to `String(row[column.name])`. */
  cellRenderer?: CellRenderer<T>;
  /** Optional header renderer; defaults to `column.label ?? column.name`. */
  headerRenderer?: HeaderRenderer<T>;
  /** Forwarded to the cell as `class` attribute. */
  cellClass?: string;
  /**
   * Opt this column into the filter row. Default `false` — deliberately the
   * opposite of `sortable`, because adding the row is a visible change to the
   * table. The row itself is emitted only when at least one column sets this.
   */
  filterable?: boolean;
  /** Contents of this column's filter panel. Ignored unless `filterable`. */
  filterRenderer?: FilterRenderer<T>;
  /**
   * Purely visual: marks the trigger as "this column has an active filter".
   * The component attaches no meaning to it — what counts as active, and when,
   * belongs to the consumer.
   */
  filterActive?: boolean;
}
