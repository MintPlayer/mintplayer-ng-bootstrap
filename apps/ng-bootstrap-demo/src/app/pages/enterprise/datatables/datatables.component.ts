import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { Color } from '@mintplayer/ng-bootstrap';
import {
  BsDatatableComponent,
  BsDatatableCellDirective,
  BsDatatableFilterDirective,
  BsDatatableHeaderDirective,
  BsDatatableRowDirective,
  type DatatableColumnDef,
  type DatatableFetch,
  type DatatableFetchRequest,
  type DistinctValue,
  type FilterChangeDetail,
  type FilterOperator,
  type SortColumn,
} from '@mintplayer/ng-bootstrap/datatable';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { dedent } from 'ts-dedent';
import { Artist } from '../../../entities/artist';
import { ArtistService } from '../../../services/artist/artist.service';
import { TreeItem } from '../../../entities/tree-item';
import { TreeItemService } from '../../../services/tree-item/tree-item.service';

/** Mirrors the component's own operator glyphs for the trigger summary. */
const OPERATOR_SYMBOLS: Record<FilterOperator, string> = {
  eq: '=',
  neq: '≠',
  lt: '<',
  lte: '≤',
  gt: '>',
  gte: '≥',
};

function compare(value: number, operator: FilterOperator, operand: number): boolean {
  switch (operator) {
    case 'eq':
      return value === operand;
    case 'neq':
      return value !== operand;
    case 'lt':
      return value < operand;
    case 'lte':
      return value <= operand;
    case 'gt':
      return value > operand;
    case 'gte':
      return value >= operand;
  }
}

@Component({
  selector: 'demo-datatables',
  templateUrl: './datatables.component.html',
  styleUrls: ['./datatables.component.scss'],
  imports: [
    FormsModule,
    BsDatatableComponent, BsDatatableCellDirective, BsDatatableFilterDirective, BsDatatableHeaderDirective, BsDatatableRowDirective,
    BsSelectComponent, BsSelectOption,
    BsCodeSnippetComponent,
    BsBadgeComponent,
    BsCheckboxComponent,
    BsButtonTypeDirective,
    BsGridComponent, BsGridRowDirective, BsGridColumnDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatatablesComponent {

  protected readonly colors = Color;

  private artistService = inject(ArtistService);
  private treeItemService = inject(TreeItemService);

  mode = signal<'pagination' | 'virtualScroll'>('pagination');
  virtualScroll = computed(() => this.mode() === 'virtualScroll');

  /**
   * Columns are data. `name` is the sort key the server receives (Spark sorts
   * on the PascalCase property); the row template renders the cells, so it
   * need not match the row's own property names.
   */
  artistColumns: DatatableColumnDef[] = [
    { name: 'Name', label: 'Artist' },
    { name: 'YearStarted', label: 'Year started' },
    { name: 'YearQuit', label: 'Year quit' },
  ];

  twoColumns: DatatableColumnDef[] = this.artistColumns.slice(0, 2);

  sortColumns = signal<SortColumn[]>([{ property: 'YearStarted', direction: 'ascending' }]);

  /** The selected row keys (`rowKey`), which survive paging and sorting. */
  selection = signal<string[]>([]);

  fetchArtists: DatatableFetch<Artist> = (req: DatatableFetchRequest) =>
    this.artistService.pageArtists(<PaginationRequest>req).then(
      (response) => response ?? <PaginationResponse<Artist>>{ data: [], totalRecords: 0, totalPages: 1, page: req.page, perPage: req.perPage },
    );

  rowKey = (a: unknown) => String((a as Artist).id);

  // ─── Column resizing demo ──────────────────────────────────────────────
  // Per-column resizable + label: the actions column has a fixed width and an
  // icon-only header, so it opts out of resizing and names itself.

  resizeColumns: DatatableColumnDef[] = [
    ...this.twoColumns,
    { name: 'actions', label: 'Actions', sortable: false, resizable: false },
  ];

  inspectedArtist = signal<Artist | null>(null);

  // ─── Fill demo ─────────────────────────────────────────────────────────

  protected readonly snippetFillHtml = dedent`
    <!-- The parent needs a definite height. -->
    <div style="height: 225px">
      <bs-datatable fill pagination [columns]="columns" [fetch]="fetchArtists">
        <ng-template bsDatatableRow let-artist="row">
          <td>{{ artist.name }}</td>
          <td>{{ artist.yearStarted }}</td>
        </ng-template>
      </bs-datatable>
    </div>
  `;

  protected readonly snippetFillVirtualHtml = dedent`
    <!-- The parent's height replaces the default virtual viewport. Rows still
         loading render as placeholders, without calling the template. -->
    <div style="height: 225px">
      <bs-datatable fill [virtualScroll]="true" [itemSize]="40" [columns]="columns"
        [fetch]="fetchArtists" [perPage]="25" [rowKey]="rowKey">
        <ng-template bsDatatableRow let-artist="row">
          <td>{{ artist.name }}</td>
          <td>{{ artist.yearStarted }}</td>
        </ng-template>
      </bs-datatable>
    </div>
  `;

  protected readonly snippetResizeHtml = dedent`
    <!-- columns: [
           { name: 'Name', label: 'Artist' },
           { name: 'YearStarted', label: 'Year started' },
           // Icon-only header: label names it; resizable: false drops its handle.
           { name: 'actions', label: 'Actions', sortable: false, resizable: false },
         ] -->
    <bs-datatable [columns]="columns" [fetch]="fetchArtists" pagination>
      <ng-template bsDatatableHeader let-column="column">
        @if (column.name === 'actions') {
          <span aria-hidden="true">&#8943;</span>
        } @else {
          {{ column.label }}
        }
      </ng-template>

      <ng-template bsDatatableRow let-artist="row">
        <td>{{ artist.name }}</td>
        <td>{{ artist.yearStarted }}</td>
        <td>
          <button type="button" class="btn btn-sm btn-outline-secondary"
                  (click)="inspect(artist)">Details</button>
        </td>
      </ng-template>
    </bs-datatable>
  `;

  // ─── Row selection demo: 'checkbox' mode ───────────────────────────────
  // A row click only opens the row; the checkbox cell alone selects. The
  // selection is keyed by rowKey, so it survives paging, sorting and reload().

  checkboxSelection = signal<string[]>([]);
  openedArtist = signal<Artist | null>(null);

  rowLabel = (a: unknown) => (a as Artist).name;

  checkboxSelectionSummary = computed(() => `Selected ${this.checkboxSelection().length} artist(s)`);
  checkboxSelectionKeys = computed(() =>
    [...this.checkboxSelection()]
      .sort((a, b) => Number(a) - Number(b))
      .join(', ') || '—',
  );
  openedArtistSummary = computed(() => `Opened: ${this.openedArtist()?.name ?? '—'}`);

  // ─── Lazy windowed-fetch demo (real artist API, server-paged) ──────────
  // Reuses the same real, server-paged artist endpoint as the basic section.
  // The WC fetches only the pages near the viewport; the log proves it never
  // drains the whole result set.

  /** Pages actually fetched — proof that scrolling drives O(visible/perPage) requests, not a full drain. */
  windowedFetchedPages = signal<number[]>([]);

  fetchWindowedArtists: DatatableFetch<Artist> = async (req: DatatableFetchRequest) => {
    this.windowedFetchedPages.update((pages) =>
      pages.includes(req.page) ? pages : [...pages, req.page].sort((a, b) => a - b),
    );
    const response = await this.artistService.pageArtists(<PaginationRequest>req);
    return response ?? <PaginationResponse<Artist>>{ data: [], totalRecords: 0, totalPages: 1, page: req.page, perPage: req.perPage };
  };

  // ─── Tree-mode demo ────────────────────────────────────────────────────

  treeColumns: DatatableColumnDef[] = [
    { name: 'name', label: 'Name' },
    { name: 'code', label: 'Code' },
    { name: 'headcount', label: 'Headcount' },
  ];

  treeExpanded = signal<unknown[]>([]);
  treeSelection = signal<string[]>([]);

  fetchTreeItems: DatatableFetch<TreeItem> = this.treeItemService.fetch;

  treeRowKey = (item: unknown) => String((item as TreeItem).id);
  treeIdKey: keyof TreeItem = 'id';
  treeChildCountKey: keyof TreeItem = 'childCount';

  protected readonly snippetBasicHtml = dedent`
    <bs-datatable pagination [columns]="columns" [fetch]="fetchArtists"
      [(sortColumns)]="sortColumns" [perPageOptions]="[10, 20, 50]">
      <ng-template bsDatatableRow let-artist="row">
        <td class="text-nowrap">{{ artist.name }}</td>
        <td class="text-nowrap">{{ artist.yearStarted }}</td>
        <td class="text-nowrap">{{ artist.yearQuit }}</td>
      </ng-template>
    </bs-datatable>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, inject, signal } from '@angular/core';
    import {
      BsDatatableComponent,
      BsDatatableRowDirective,
      type DatatableColumnDef,
      type DatatableFetch,
      type SortColumn,
    } from '@mintplayer/ng-bootstrap/datatable';
    import { Artist } from './artist';
    import { ArtistService } from './artist.service';

    @Component({
      selector: 'my-artists',
      templateUrl: './my-artists.component.html',
      imports: [BsDatatableComponent, BsDatatableRowDirective],
    })
    export class MyArtistsComponent {
      private artistService = inject(ArtistService);

      // name is the sort key the fetch receives; label is the header text.
      columns: DatatableColumnDef[] = [
        { name: 'Name', label: 'Artist' },
        { name: 'YearStarted', label: 'Year started' },
        { name: 'YearQuit', label: 'Year quit' },
      ];

      sortColumns = signal<SortColumn[]>([]);

      // Resolves { data, totalRecords }; req carries page, perPage,
      // sortColumns and an AbortSignal.
      fetchArtists: DatatableFetch<Artist> = (req) => this.artistService.pageArtists(req);
    }
  `;

  protected readonly snippetSortableHtml = dedent`
    <!-- Every column sorts unless it says sortable: false. Clicking a header
         cycles ascending, descending, off; the fetch callback receives
         req.sortColumns, and [(sortColumns)] reads and writes it. -->
    <bs-datatable [columns]="columns" [fetch]="fetchArtists" [(sortColumns)]="sortColumns">
      <ng-template bsDatatableRow let-artist="row">
        <td>{{ artist.name }}</td>
        <td>{{ artist.yearStarted }}</td>
        <td>{{ artist.yearQuit }}</td>
      </ng-template>
    </bs-datatable>
  `;

  protected readonly snippetSelectionHtml = dedent`
    <!-- selectionMode = 'none' | 'single' | 'multiple' | 'checkbox'.
         'checkbox': a row click only opens the row (rowclick); the checkbox
         cell alone selects. Enter opens, Space toggles.

         The selection is the row KEYS, from [rowKey], and survives paging,
         sorting and reload(). With [fetch] the key MUST be stable — taken from
         the row, never from its position. (selectionchanged) also hands over
         the selected rows. -->
    <button type="button" (click)="table.reload()">Reload</button>

    <bs-datatable #table
      [columns]="columns"
      [fetch]="fetchArtists"
      pagination
      selectionMode="checkbox"
      [rowKey]="rowKey"
      [rowLabel]="rowLabel"
      [(selectedIds)]="selection"
      (rowclick)="opened.set($event.row)">
      <!-- row template as above -->
    </bs-datatable>
  `;

  protected readonly snippetSelectionTs = dedent`
    selection = signal<string[]>([]);
    opened = signal<Artist | null>(null);

    // Identity: a stable key per row. Required with [fetch].
    rowKey = (a: unknown) => String((a as Artist).id);
    // Names each row checkbox for assistive technology: "Select Coldplay".
    rowLabel = (a: unknown) => (a as Artist).name;
  `;

  protected readonly snippetWindowedHtml = dedent`
    <!-- Virtual + fetch: the table fetches only the pages whose rows are in
         (or near) the viewport, keyed by [perPage]. Placeholder rows hold the
         scroll position until each window arrives; the row template is not
         called for them. The [fetch] contract is the same as paged mode. -->
    <bs-datatable
      [virtualScroll]="true"
      [itemSize]="40"
      [columns]="columns"
      [fetch]="fetchWindowedArtists"
      [perPage]="25"
      [rowKey]="rowKey">
      <ng-template bsDatatableRow let-artist="row">
        <td>{{ artist.name }}</td>
        <td>{{ artist.yearStarted }}</td>
        <td>{{ artist.yearQuit }}</td>
      </ng-template>
    </bs-datatable>
  `;

  protected readonly snippetWindowedTs = dedent`
    // The same [fetch] callback as paged, non-virtual mode — page + perPage.
    // In flat virtual mode the table calls it once per *needed page* as the
    // user scrolls, instead of draining every page up front.
    fetchWindowedArtists: DatatableFetch<Artist> = (req) =>
      this.artistService.pageArtists(req); // resolves { data, totalRecords }
  `;

  protected readonly snippetTreeHtml = dedent`
    <!-- Tree mode: virtual scrolling composes with nested expandable rows.
         Each expanded row's children load lazily on demand; placeholders
         reserve viewport space until the children arrive so the scrollbar
         stays accurate. No row template: a cell template restyles one column
         and the others keep their text. -->
    <bs-datatable class="flex-grow-1"
      [virtualScroll]="true"
      [itemSize]="40"
      [tree]="true"
      [idKey]="treeIdKey"
      [childCountKey]="treeChildCountKey"
      [columns]="treeColumns"
      [fetch]="fetchTreeItems"
      [perPage]="100"
      [(expandedIds)]="treeExpanded"
      [rowKey]="treeRowKey"
      selectionMode="multiple"
      selectionStrategy="cascading"
      [(selectedIds)]="treeSelection">
      <ng-template bsDatatableCell let-row="row" let-column="column">
        @if (column.name === 'code') {
          <span class="font-monospace small">{{ row.code }}</span>
        } @else {
          {{ row[column.name] }}
        }
      </ng-template>
    </bs-datatable>
  `;

  protected readonly snippetTreeTs = dedent`
    import { Component, inject, signal } from '@angular/core';
    import {
      BsDatatableComponent,
      BsDatatableCellDirective,
      type DatatableColumnDef,
      type DatatableFetch,
    } from '@mintplayer/ng-bootstrap/datatable';
    import { TreeItem } from './tree-item';
    import { TreeItemService } from './tree-item.service';

    @Component({
      selector: 'org-tree',
      templateUrl: './org-tree.component.html',
      imports: [BsDatatableComponent, BsDatatableCellDirective],
    })
    export class OrgTreeComponent {
      private treeItemService = inject(TreeItemService);

      treeColumns: DatatableColumnDef[] = [
        { name: 'name', label: 'Name' },
        { name: 'code', label: 'Code' },
        { name: 'headcount', label: 'Headcount' },
      ];

      treeExpanded = signal<unknown[]>([]);
      treeSelection = signal<string[]>([]);

      // Single callback for both roots and children — branches on parentId.
      fetchTreeItems: DatatableFetch<TreeItem> = this.treeItemService.fetch;

      treeRowKey = (item: unknown) => String((item as TreeItem).id);
      treeIdKey: keyof TreeItem = 'id';
      treeChildCountKey: keyof TreeItem = 'childCount';
    }
  `;

  protected readonly snippetTreeServiceTs = dedent`
    // tree-item.service.ts — branches on req.parentId for roots vs children.
    @Injectable({ providedIn: 'root' })
    export class TreeItemService {
      private readonly http = inject(HttpClient);

      fetch: DatatableFetch<TreeItem> = async (req: DatatableFetchRequest) => {
        const url = req.parentId == null
          ? '/api/treeItems'
          : \`/api/treeItems/\${req.parentId}/children\`;
        const params = new HttpParams()
          .set('page', String(req.page))
          .set('perPage', String(req.perPage));
        const r = await firstValueFrom(this.http.get<PagedResult<TreeItem>>(url, { params }));
        return { data: r.items, totalRecords: r.totalCount };
      };
    }
  `;

  // ─── Column filters ───────────────────────────────────────────────────────
  // The component holds no filter state and defines no predicate model: it
  // collects a selection and emits it. Everything below — the master copy, the
  // predicate, `filterActive`, `filterSummary` — belongs to this page, which is
  // what lets the same row drive a client-side match here and a server query
  // somewhere else.

  /** Drives `filterable` on the columns. No filterable column, no filter row. */
  showFilters = signal(true);

  /**
   * The UNFILTERED master copy. `[data]` is bound to the filtered view, so
   * without this the first selection would be the last: the value lists are
   * computed from the rows the element holds, and filtering the source would
   * remove the values the user needs in order to widen the filter again.
   */
  allArtists = signal<Artist[]>([]);

  constructor() {
    // One page big enough to hold the lot. A consumer with more rows than that
    // would supply `[distincts]` instead — the element reports that it has no
    // values rather than computing a list from the page it happens to hold.
    this.artistService
      .pageArtists(<PaginationRequest>{
        page: 1,
        perPage: 500,
        sortColumns: [{ property: 'Name', direction: 'ascending' }],
      })
      .then((response) => this.allArtists.set(response?.data ?? []));
  }

  /** Selected distinct values for the Artist column, from the built-in panel. */
  nameSelection = signal<DistinctValue[]>([]);
  /** The panel's include/exclude toggle. */
  nameInverse = signal(false);
  /** Comparison-mode state for `yearStarted`, straight off the event. */
  yearOperator = signal<FilterOperator>('gte');
  yearOperand = signal<number | null>(null);
  /** The override panel's own state — something the component could not guess. */
  activeOnly = signal(false);

  nameSummary = computed(() => {
    const selected = this.nameSelection();
    if (selected.length === 0) return undefined;
    if (selected.length === 1) return selected[0].label;
    return `${selected.length} selected`;
  });

  yearSummary = computed(() => {
    const operand = this.yearOperand();
    return operand === null ? undefined : `${OPERATOR_SYMBOLS[this.yearOperator()]} ${operand}`;
  });

  filteredArtists = computed(() => {
    const selected = this.nameSelection();
    const inverse = this.nameInverse();
    const operator = this.yearOperator();
    const operand = this.yearOperand();
    const activeOnly = this.activeOnly();
    return this.allArtists()
      .filter((a) => {
        if (selected.length === 0) return true;
        const hit = selected.some((v) => v.value === a.name);
        return inverse ? !hit : hit;
      })
      .filter((a) => (operand === null ? true : compare(a.yearStarted ?? 0, operator, operand)))
      .filter((a) => (activeOnly ? a.yearQuit == null : true));
  });

  filterSort = signal<SortColumn[]>([{ property: 'name', direction: 'ascending' }]);

  /**
   * The columns, rebuilt whenever a filter's state changes: `filterActive` and
   * `filterSummary` are the page's to say, because only the page knows what
   * its filter did.
   */
  filterColumns = computed<DatatableColumnDef[]>(() => {
    const filterable = this.showFilters();
    return [
      // No filterMode: the built-in panel lists every distinct name in the data.
      {
        name: 'name',
        label: 'Artist',
        filterable,
        filterActive: this.nameSelection().length > 0,
        filterSummary: this.nameSummary(),
      },
      // Comparison mode: a year is a quantity, so an operator and one number
      // beats ticking every distinct year. Still the built-in panel.
      {
        name: 'yearStarted',
        label: 'Year started',
        filterable,
        filterMode: 'comparison',
        filterInputType: 'number',
        filterActive: this.yearOperand() !== null,
        filterSummary: this.yearSummary(),
      },
      // Custom mode: the *bsDatatableFilter template renders this panel.
      {
        name: 'yearQuit',
        label: 'Year quit',
        sortable: false,
        filterable,
        filterMode: 'custom',
        filterActive: this.activeOnly(),
      },
    ];
  });

  /**
   * One handler for both panels. `mode` discriminates the union, so the
   * comparison branch cannot read `selected` and the values branch cannot read
   * `operand` — the compiler enforces what the runtime shape actually is.
   */
  onFilterChange(detail: FilterChangeDetail) {
    if (detail.mode === 'values' && detail.column === 'name') {
      this.nameSelection.set(detail.selected);
      this.nameInverse.set(detail.inverse);
      return;
    }
    if (detail.mode === 'comparison' && detail.column === 'yearStarted') {
      this.yearOperator.set(detail.operator);
      this.yearOperand.set(detail.operand === null ? null : Number(detail.operand));
    }
  }

  protected readonly snippetFilterHtml = dedent`
    <!-- filterable drives the row: with none, there is no second header row. -->
    <bs-checkbox [type]="'checkbox'" [(ngModel)]="showFilters">Show the filter row</bs-checkbox>

    <bs-datatable [columns]="filterColumns()" [data]="filteredArtists()" [rowKey]="rowKey"
      (filterchange)="onFilterChange($event)">

      <!-- The escape hatch, for the column with filterMode: 'custom'. Style
           this markup yourself: it is your DOM, and .form-control is only
           styled inside bs-* components here. -->
      <ng-template bsDatatableFilter let-ctx="ctx">
        <div class="demo-filter-panel">
          <label class="demo-filter-check">
            <input type="checkbox" [ngModel]="activeOnly()" (ngModelChange)="activeOnly.set($event)" />
            <span>Still active only</span>
          </label>
        </div>
      </ng-template>
    </bs-datatable>
  `;

  protected readonly snippetFilterTs = dedent`
    // Bind [data] to the FILTERED view but keep the unfiltered master copy:
    // the value lists are computed from the rows the element holds, so
    // filtering the source would remove the values needed to widen the filter.
    allArtists = signal<Artist[]>([]);

    nameSelection = signal<DistinctValue[]>([]);
    nameInverse = signal(false);
    yearOperator = signal<FilterOperator>('gte');
    yearOperand = signal<number | null>(null);

    filterColumns = computed<DatatableColumnDef[]>(() => [
      // Default: a checkbox list of the column's distinct values, with
      // search, include/exclude and clear. No template, no wiring.
      { name: 'name', label: 'Artist', filterable: this.showFilters(),
        filterActive: this.nameSelection().length > 0, filterSummary: this.nameSummary() },
      // Comparison mode: an operator and one number. The right shape for a
      // quantity — ticking forty individual years is not a filter.
      { name: 'yearStarted', label: 'Year started', filterable: this.showFilters(),
        filterMode: 'comparison', filterInputType: 'number',
        filterActive: this.yearOperand() !== null, filterSummary: this.yearSummary() },
      // Custom mode: the bsDatatableFilter template renders the panel.
      { name: 'yearQuit', label: 'Year quit', filterable: this.showFilters(),
        filterMode: 'custom', filterActive: this.activeOnly() },
    ]);

    // One handler, one discriminated union. Switching on \`mode\` means the
    // comparison branch cannot read \`selected\` and the values branch cannot
    // read \`operand\` — the compiler enforces the real runtime shape.
    onFilterChange(detail: FilterChangeDetail) {
      if (detail.mode === 'values' && detail.column === 'name') {
        this.nameSelection.set(detail.selected);   // [] when the user clears
        this.nameInverse.set(detail.inverse);      // the include/exclude toggle
        return;
      }
      if (detail.mode === 'comparison' && detail.column === 'yearStarted') {
        this.yearOperator.set(detail.operator);    // 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte'
        this.yearOperand.set(detail.operand as number | null);   // null = cleared
      }
    }

    // The table does not hold every row? Then it cannot compute a value list,
    // and it says so rather than guessing from the page it has. Supply one:
    //   [distincts]="loadDistincts"
    //   loadDistincts: DatatableDistincts = async ({ column, search, signal }) =>
    //     fetch(\`/api/distincts/\${column}?q=\${search}\`, { signal }).then(r => r.json());
    // Resolve null for a column to hand that one back to the local path.
    // Comparison columns never ask — that panel shows no list.
  `;
}
