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
}
