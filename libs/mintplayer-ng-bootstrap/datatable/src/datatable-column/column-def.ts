import { TemplateRef } from '@angular/core';

/**
 * Programmatic column definition for `<bs-datatable [columns]="...">`.
 *
 * Use this when the column set is data-driven (e.g. derived from an
 * `EntitySchema` returned by an API) and not knowable at template-parse
 * time. When the consumer passes `[columns]`, it overrides the
 * `<ng-template bsDatatableColumn=...>` content-children discovery.
 *
 * For static template-based columns, use the
 * `BsDatatableColumnDirective` (`*bsDatatableColumn=...`) instead.
 */
export interface ColumnDef {
  /** Data property name on each row; used as `SortColumn.property`. */
  name: string;
  /** Header label shown in the `<th>`. */
  label: string;
  /** Whether the column header acts as a sort toggle. Default true. */
  sortable?: boolean;
  /**
   * Optional custom header template. When omitted, the `label` is
   * rendered as plain text. When provided, takes priority over `label`.
   */
  templateRef?: TemplateRef<unknown>;
}

/**
 * The narrow surface the datatable template + base sort/resize logic
 * needs from a column — satisfied by both
 * `BsDatatableColumnDirective` (signal-shaped) and the internal
 * `SyntheticColumn` wrapper around a `ColumnDef`.
 */
export interface DatatableColumnRef {
  name(): string;
  sortable(): boolean;
  templateRef: TemplateRef<unknown> | null;
  /** Plain-text fallback header for programmatic columns. `null` for directive-defined columns (their `templateRef` is the source of truth). */
  label: string | null;
}

/** Internal: wraps a `ColumnDef` in the `DatatableColumnRef` shape. */
export class SyntheticColumn implements DatatableColumnRef {
  readonly templateRef: TemplateRef<unknown> | null;
  readonly label: string;
  private readonly _name: string;
  private readonly _sortable: boolean;

  constructor(def: ColumnDef) {
    this._name = def.name;
    this.label = def.label;
    this._sortable = def.sortable ?? true;
    this.templateRef = def.templateRef ?? null;
  }

  name(): string { return this._name; }
  sortable(): boolean { return this._sortable; }
}
