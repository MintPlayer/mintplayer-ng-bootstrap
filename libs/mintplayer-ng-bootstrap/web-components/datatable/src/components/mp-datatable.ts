import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { datatableStyles } from '../styles';
import { computeNextSort, sortRows, type SortColumn } from '../sort';
import type {
  CellContent,
  DatatableColumnDef,
  RowKey,
} from '../types';

export type DatatableSelectionMode = 'none' | 'single' | 'multiple';

export interface RowEventDetail<T = unknown> {
  row: T;
  rowIndex: number;
  rowKey: string;
  originalEvent: Event;
}

export interface SortChangeEventDetail {
  sortColumns: SortColumn[];
}

export interface SelectionChangeEventDetail {
  selectedIds: string[];
}

let instanceCounter = 0;

const SORT_ASC_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
  '<path d="M3.5 12.5a.5.5 0 0 1-1 0V3.707L1.354 4.854a.5.5 0 1 1-.708-.708l2-2a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L3.5 3.707V12.5z"/>' +
  '</svg>';

const SORT_DESC_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
  '<path d="M3.5 3.5a.5.5 0 0 0-1 0v8.793L1.354 11.146a.5.5 0 0 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L3.5 12.293V3.5z"/>' +
  '</svg>';

/**
 * `<mp-datatable>` — property-driven data grid.
 *
 * - Columns are declared programmatically via `DatatableColumnDef[]`.
 *   Each column supplies a name (sort key) + optional `cellRenderer`.
 * - Sort algorithm extracted into the pure `computeNextSort` helper.
 * - Selection model: `'none' | 'single' | 'multiple'` with checkbox column
 *   when multi-select.
 * - Row events: `mp-datatable-row-click`, `mp-datatable-row-dblclick`,
 *   `mp-datatable-row-contextmenu` — all carry `RowEventDetail`.
 * - Pagination footer when `pagination` enabled.
 * - Column resize via a 6px handle at the right edge of each header.
 */
export class MpDatatable extends LitElement {
  static override styles = [datatableStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'selection-mode',
      'pagination',
      'resizable-columns',
      'auto-sort',
      'empty-message',
    ];
  }

  private readonly instanceId = `mp-datatable-${++instanceCounter}`;

  private _columns: DatatableColumnDef[] = [];
  private _data: unknown[] = [];
  private _sortColumns: SortColumn[] = [];
  private _selectionMode: DatatableSelectionMode = 'none';
  private _selectedIds: Set<string> = new Set();
  private _cutIds: Set<string> = new Set();
  private _focusedRowKey: string | null = null;
  private _rowKey: RowKey = (row, index) => {
    const r = row as { id?: unknown } | null;
    return r && r.id != null ? String(r.id) : `row-${index}`;
  };
  private _columnWidths: Map<string, number> = new Map();
  private _loading = false;
  private _emptyMessage = 'No data';
  private _pagination = false;
  private _page = 1;
  private _perPage = 20;
  private _perPageOptions: number[] = [10, 20, 50];
  private _autoSort = true;

  /** When true, the WC sorts `data` itself using `sortRows`. Set `false` if the consumer sorts externally. */
  get autoSort(): boolean {
    return this._autoSort;
  }
  set autoSort(value: boolean) {
    this._autoSort = !!value;
    this.requestUpdate();
  }

  get columns(): DatatableColumnDef[] {
    return this._columns;
  }
  set columns(value: DatatableColumnDef[]) {
    this._columns = Array.isArray(value) ? value : [];
    this.requestUpdate();
  }

  get data(): unknown[] {
    return this._data;
  }
  set data(value: unknown[]) {
    this._data = Array.isArray(value) ? value : [];
    this.requestUpdate();
  }

  get sortColumns(): SortColumn[] {
    return [...this._sortColumns];
  }
  set sortColumns(value: SortColumn[]) {
    this._sortColumns = Array.isArray(value) ? [...value] : [];
    this.requestUpdate();
  }

  get selectionMode(): DatatableSelectionMode {
    return this._selectionMode;
  }
  set selectionMode(value: DatatableSelectionMode) {
    this._selectionMode = value;
    if (value === 'none') this._selectedIds.clear();
    this.requestUpdate();
  }

  get selectedIds(): string[] {
    return [...this._selectedIds];
  }
  set selectedIds(value: string[] | ReadonlyArray<string>) {
    this._selectedIds = new Set(value ?? []);
    this.requestUpdate();
  }

  get cutIds(): string[] {
    return [...this._cutIds];
  }
  set cutIds(value: string[] | ReadonlyArray<string>) {
    this._cutIds = new Set(value ?? []);
    this.requestUpdate();
  }

  get focusedRowKey(): string | null {
    return this._focusedRowKey;
  }
  set focusedRowKey(value: string | null) {
    this._focusedRowKey = value;
    this.requestUpdate();
  }

  get rowKey(): RowKey {
    return this._rowKey;
  }
  set rowKey(value: RowKey) {
    this._rowKey = typeof value === 'function' ? value : this._rowKey;
    this.requestUpdate();
  }

  get loading(): boolean {
    return this._loading;
  }
  set loading(value: boolean) {
    this._loading = !!value;
    this.requestUpdate();
  }

  get emptyMessage(): string {
    return this._emptyMessage;
  }
  set emptyMessage(value: string) {
    this._emptyMessage = value || 'No data';
    this.requestUpdate();
  }

  get pagination(): boolean {
    return this._pagination;
  }
  set pagination(value: boolean) {
    this._pagination = !!value;
    this.requestUpdate();
  }

  get page(): number {
    return this._page;
  }
  set page(value: number) {
    const next = Math.max(1, Math.floor(value || 1));
    if (this._page !== next) {
      this._page = next;
      this.requestUpdate();
    }
  }

  get perPage(): number {
    return this._perPage;
  }
  set perPage(value: number) {
    const next = Math.max(1, Math.floor(value || 1));
    if (this._perPage !== next) {
      this._perPage = next;
      this._page = 1;
      this.requestUpdate();
    }
  }

  get perPageOptions(): number[] {
    return [...this._perPageOptions];
  }
  set perPageOptions(value: number[]) {
    this._perPageOptions = Array.isArray(value) && value.length > 0 ? [...value] : [10, 20, 50];
    this.requestUpdate();
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (name === 'selection-mode') {
      const v = newValue;
      if (v === 'none' || v === 'single' || v === 'multiple') {
        this.selectionMode = v;
      }
    } else if (name === 'pagination') {
      this.pagination = newValue !== null;
    } else if (name === 'resizable-columns') {
      this.resizableColumns = newValue !== null;
    } else if (name === 'auto-sort') {
      this.autoSort = newValue !== 'false';
    } else if (name === 'empty-message') {
      this.emptyMessage = newValue ?? 'No data';
    }
  }

  private _resizableColumns = true;
  get resizableColumns(): boolean {
    return this._resizableColumns;
  }
  set resizableColumns(value: boolean) {
    this._resizableColumns = !!value;
    this.requestUpdate();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'grid');
    }
  }

  override render(): TemplateResult {
    const rows = this.computeVisibleRows();
    const totalPages = this.pagination ? Math.max(1, Math.ceil(this._data.length / this._perPage)) : 1;
    const showCheckboxes = this._selectionMode === 'multiple';

    return html`
      <div class="datatable-shell">
        <div class="datatable-scroll" role="presentation">
          <table aria-rowcount=${this._data.length + 1}>
            <thead>
              <tr role="row" aria-rowindex="1">
                ${showCheckboxes
                  ? html`<th class="checkbox-cell" scope="col" aria-label="Select all">
                      <input
                        type="checkbox"
                        .checked=${this._selectedIds.size > 0 && this._selectedIds.size === this._data.length}
                        .indeterminate=${this._selectedIds.size > 0 && this._selectedIds.size < this._data.length}
                        @change=${this.onToggleSelectAll}
                      />
                    </th>`
                  : nothing}
                ${this._columns.map((col, idx) => this.renderHeader(col, idx))}
              </tr>
            </thead>
            <tbody>
              ${this._loading
                ? html`<tr><td colspan=${this._columns.length + (showCheckboxes ? 1 : 0)} class="loading-state">Loading…</td></tr>`
                : rows.length === 0
                  ? html`<tr><td colspan=${this._columns.length + (showCheckboxes ? 1 : 0)} class="empty-state">${this._emptyMessage}</td></tr>`
                  : repeat(
                      rows,
                      ({ key }) => key,
                      ({ row, key, rowIndex }) => this.renderRow(row, key, rowIndex, showCheckboxes),
                    )}
            </tbody>
          </table>
        </div>
        ${this._pagination ? this.renderFooter(totalPages) : nothing}
      </div>
    `;
  }

  private renderHeader(col: DatatableColumnDef, _index: number): TemplateResult {
    const sortable = col.sortable ?? true;
    const sortIndex = this._sortColumns.findIndex((s) => s.property === col.name);
    const sortDirection = sortIndex >= 0 ? this._sortColumns[sortIndex].direction : null;
    const width = this._columnWidths.get(col.name) ?? col.width;
    const headerContent: CellContent = col.headerRenderer ? col.headerRenderer(col) : (col.label ?? col.name);

    const style: Record<string, string> = {};
    if (typeof width === 'number') {
      style['width'] = `${width}px`;
      style['minWidth'] = `${width}px`;
    }

    return html`
      <th
        scope="col"
        data-column=${col.name}
        data-sortable=${sortable ? 'true' : 'false'}
        aria-sort=${sortDirection
          ? sortDirection === 'ascending'
            ? 'ascending'
            : 'descending'
          : 'none'}
        style=${styleMap(style)}
        @click=${(ev: MouseEvent) => this.onHeaderClick(col, ev)}
      >
        <span class="header-cell">
          <span>${renderContent(headerContent)}</span>
          ${sortDirection
            ? html`<span class="sort-indicator">${unsafeSvg(sortDirection === 'ascending' ? SORT_ASC_SVG : SORT_DESC_SVG)}</span>`
            : nothing}
          ${sortIndex >= 0 && this._sortColumns.length > 1
            ? html`<span class="sort-index">${sortIndex + 1}</span>`
            : nothing}
        </span>
        ${this._resizableColumns
          ? html`<span
              class="resize-handle"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize column ${col.label ?? col.name}"
              @pointerdown=${(ev: PointerEvent) => this.startColumnResize(col, ev)}
            ></span>`
          : nothing}
      </th>
    `;
  }

  private renderRow(row: unknown, key: string, rowIndex: number, showCheckboxes: boolean): TemplateResult {
    const selected = this._selectedIds.has(key);
    const cut = this._cutIds.has(key);
    const focused = this._focusedRowKey === key;

    return html`
      <tr
        role="row"
        aria-rowindex=${rowIndex + 2}
        aria-selected=${this._selectionMode !== 'none' ? (selected ? 'true' : 'false') : nothing}
        data-row-key=${key}
        data-selected=${selected ? 'true' : 'false'}
        data-cut=${cut ? 'true' : 'false'}
        data-focused=${focused ? 'true' : 'false'}
        data-clickable=${this._selectionMode !== 'none' || this.hasRowClickListeners() ? 'true' : 'false'}
        @click=${(ev: MouseEvent) => this.onRowClick(row, key, rowIndex, ev)}
        @dblclick=${(ev: MouseEvent) => this.onRowDblClick(row, key, rowIndex, ev)}
        @contextmenu=${(ev: MouseEvent) => this.onRowContextMenu(row, key, rowIndex, ev)}
      >
        ${showCheckboxes
          ? html`<td class="checkbox-cell" @click=${(e: Event) => e.stopPropagation()}>
              <input
                type="checkbox"
                .checked=${selected}
                @change=${(ev: Event) => this.onRowCheckboxToggle(row, key, rowIndex, ev)}
                aria-label=${`Select row ${rowIndex + 1}`}
              />
            </td>`
          : nothing}
        ${this._columns.map((col) => this.renderCell(row, col, rowIndex))}
      </tr>
    `;
  }

  private renderCell(row: unknown, col: DatatableColumnDef, rowIndex: number): TemplateResult {
    const content = col.cellRenderer
      ? col.cellRenderer(row, col, rowIndex)
      : defaultCellContent(row, col);
    return html`<td class=${col.cellClass ?? ''} data-column=${col.name}>${renderContent(content)}</td>`;
  }

  private renderFooter(totalPages: number): TemplateResult {
    return html`
      <div class="datatable-footer">
        <span class="per-page">
          <label>Rows per page:
            <select @change=${(ev: Event) => this.onPerPageChange(ev)}>
              ${this._perPageOptions.map(
                (opt) => html`<option value=${opt} ?selected=${opt === this._perPage}>${opt}</option>`,
              )}
            </select>
          </label>
        </span>
        <span class="pagination-controls" role="navigation" aria-label="Pagination">
          <button
            type="button"
            @click=${() => this.gotoPage(1)}
            ?disabled=${this._page === 1}
            aria-label="First page"
          >«</button>
          <button
            type="button"
            @click=${() => this.gotoPage(this._page - 1)}
            ?disabled=${this._page === 1}
            aria-label="Previous page"
          >‹</button>
          <span>${this._page} / ${totalPages}</span>
          <button
            type="button"
            @click=${() => this.gotoPage(this._page + 1)}
            ?disabled=${this._page >= totalPages}
            aria-label="Next page"
          >›</button>
          <button
            type="button"
            @click=${() => this.gotoPage(totalPages)}
            ?disabled=${this._page >= totalPages}
            aria-label="Last page"
          >»</button>
        </span>
      </div>
    `;
  }

  private computeVisibleRows(): Array<{ row: unknown; key: string; rowIndex: number }> {
    let rows: unknown[] = this._data;
    if (this._autoSort && this._sortColumns.length > 0) {
      rows = sortRows(rows, this._sortColumns);
    }
    if (this._pagination) {
      const start = (this._page - 1) * this._perPage;
      rows = rows.slice(start, start + this._perPage);
    }
    return rows.map((row, indexWithinPage) => {
      const rowIndex = this._pagination ? (this._page - 1) * this._perPage + indexWithinPage : indexWithinPage;
      return { row, rowIndex, key: this._rowKey(row, rowIndex) };
    });
  }

  private hasRowClickListeners(): boolean {
    // We can't introspect listeners; assume yes (cheaper than a "set cursor" attribute).
    return true;
  }

  private onHeaderClick(col: DatatableColumnDef, ev: MouseEvent): void {
    const sortable = col.sortable ?? true;
    if (!sortable) return;
    const target = ev.target as HTMLElement;
    if (target.closest('.resize-handle')) return;
    const next = computeNextSort(this._sortColumns, col.name, ev.shiftKey);
    this._sortColumns = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<SortChangeEventDetail>('mp-datatable-sort-change', {
        detail: { sortColumns: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onRowClick(row: unknown, key: string, rowIndex: number, ev: MouseEvent): void {
    if ((ev.target as HTMLElement).closest('input[type="checkbox"]')) return;
    this._focusedRowKey = key;
    this.handleSelectionOnClick(key, ev);
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<RowEventDetail>('mp-datatable-row-click', {
        detail: { row, rowIndex, rowKey: key, originalEvent: ev },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onRowDblClick(row: unknown, key: string, rowIndex: number, ev: MouseEvent): void {
    this.dispatchEvent(
      new CustomEvent<RowEventDetail>('mp-datatable-row-dblclick', {
        detail: { row, rowIndex, rowKey: key, originalEvent: ev },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onRowContextMenu(row: unknown, key: string, rowIndex: number, ev: MouseEvent): void {
    // Promote the row to the selection if not already selected (file-manager convention).
    if (this._selectionMode !== 'none' && !this._selectedIds.has(key)) {
      this._selectedIds = new Set([key]);
      this._focusedRowKey = key;
      this.emitSelectionChange();
      this.requestUpdate();
    }
    this.dispatchEvent(
      new CustomEvent<RowEventDetail>('mp-datatable-row-contextmenu', {
        detail: { row, rowIndex, rowKey: key, originalEvent: ev },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  private onRowCheckboxToggle(_row: unknown, key: string, _rowIndex: number, _ev: Event): void {
    if (this._selectionMode === 'none') return;
    if (this._selectionMode === 'single') {
      this._selectedIds = new Set([key]);
    } else {
      const next = new Set(this._selectedIds);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      this._selectedIds = next;
    }
    this.emitSelectionChange();
    this.requestUpdate();
  }

  private onToggleSelectAll(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    if (!checked) {
      this._selectedIds = new Set();
    } else {
      this._selectedIds = new Set(this._data.map((row, i) => this._rowKey(row, i)));
    }
    this.emitSelectionChange();
    this.requestUpdate();
  }

  private handleSelectionOnClick(key: string, ev: MouseEvent): void {
    if (this._selectionMode === 'none') return;
    if (this._selectionMode === 'single') {
      this._selectedIds = new Set([key]);
      this.emitSelectionChange();
      return;
    }
    // multiple
    if (ev.shiftKey && this._focusedRowKey && this._focusedRowKey !== key) {
      // Range select between focused row and clicked row
      const rows = this.computeVisibleRows();
      const fromIdx = rows.findIndex((r) => r.key === this._focusedRowKey);
      const toIdx = rows.findIndex((r) => r.key === key);
      if (fromIdx >= 0 && toIdx >= 0) {
        const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        const range = rows.slice(lo, hi + 1).map((r) => r.key);
        this._selectedIds = new Set([...this._selectedIds, ...range]);
        this.emitSelectionChange();
        return;
      }
    }
    if (ev.ctrlKey || ev.metaKey) {
      const next = new Set(this._selectedIds);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      this._selectedIds = next;
      this.emitSelectionChange();
      return;
    }
    this._selectedIds = new Set([key]);
    this.emitSelectionChange();
  }

  private emitSelectionChange(): void {
    this.dispatchEvent(
      new CustomEvent<SelectionChangeEventDetail>('mp-datatable-selection-change', {
        detail: { selectedIds: [...this._selectedIds] },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onPerPageChange(ev: Event): void {
    const value = Number((ev.target as HTMLSelectElement).value);
    this.perPage = value;
  }

  private gotoPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this._data.length / this._perPage));
    this._page = Math.max(1, Math.min(totalPages, page));
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<{ page: number }>('mp-datatable-page-change', {
        detail: { page: this._page },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ─── Column resize ───────────────────────────────────────────────────────
  private resizeState: {
    columnName: string;
    startX: number;
    startWidth: number;
    handle: HTMLElement;
  } | null = null;

  private startColumnResize(col: DatatableColumnDef, ev: PointerEvent): void {
    if (!this._resizableColumns) return;
    ev.preventDefault();
    ev.stopPropagation();
    const handle = ev.currentTarget as HTMLElement;
    const th = handle.closest('th') as HTMLTableCellElement | null;
    if (!th) return;
    const startWidth = th.getBoundingClientRect().width;
    this.resizeState = { columnName: col.name, startX: ev.clientX, startWidth, handle };
    handle.classList.add('active');
    handle.setPointerCapture(ev.pointerId);
    handle.addEventListener('pointermove', this.onColumnResizeMove);
    handle.addEventListener('pointerup', this.onColumnResizeEnd);
    handle.addEventListener('pointercancel', this.onColumnResizeEnd);
  }

  private onColumnResizeMove = (ev: PointerEvent): void => {
    if (!this.resizeState) return;
    const dx = ev.clientX - this.resizeState.startX;
    const next = Math.max(40, this.resizeState.startWidth + dx);
    this._columnWidths = new Map(this._columnWidths);
    this._columnWidths.set(this.resizeState.columnName, next);
    this.requestUpdate();
  };

  private onColumnResizeEnd = (ev: PointerEvent): void => {
    if (!this.resizeState) return;
    this.resizeState.handle.classList.remove('active');
    this.resizeState.handle.removeEventListener('pointermove', this.onColumnResizeMove);
    this.resizeState.handle.removeEventListener('pointerup', this.onColumnResizeEnd);
    this.resizeState.handle.removeEventListener('pointercancel', this.onColumnResizeEnd);
    try {
      this.resizeState.handle.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    this.resizeState = null;
  };
}

function defaultCellContent(row: unknown, col: DatatableColumnDef): CellContent {
  if (row == null || typeof row !== 'object') return '';
  const value = (row as Record<string, unknown>)[col.name];
  if (value == null) return '';
  return String(value);
}

function renderContent(content: CellContent): unknown {
  if (content == null || content === false) return nothing;
  if (content instanceof Node) return content;
  if (typeof content === 'object' && '_$litType$' in (content as object)) {
    return content;
  }
  return content;
}

function unsafeSvg(svg: string): TemplateResult {
  const template = document.createElement('template');
  template.innerHTML = svg;
  return html`${template.content.cloneNode(true)}`;
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-datatable')) {
  customElements.define('mp-datatable', MpDatatable);
}
