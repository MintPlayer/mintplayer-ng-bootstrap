import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
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
  type DatatableFilter,
  type DatatableFilters,
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
import { CustomerService, type Customer, type CustomerParams } from '../../../services/customer/customer.service';

/** Mirrors the component's own operator glyphs for the trigger summary. */
const OPERATOR_SYMBOLS: Record<FilterOperator, string> = {
  eq: '=',
  neq: '≠',
  lt: '<',
  lte: '≤',
  gt: '>',
  gte: '≥',
};

@Component({
  selector: 'demo-datatables',
  templateUrl: './datatables.component.html',
  styleUrls: ['./datatables.component.scss'],
  imports: [
    FormsModule, JsonPipe,
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
  private customerService = inject(CustomerService);

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

  // ─── Column filters (server-side, #448) ───────────────────────────────────
  // The table owns the filter UI and the `filters` model, never the filtering:
  // `fetch` sends the model to the API, which turns it into SQL. The page only
  // says what a filter is called (`filterSummary`).

  /** Drives `filterable` on the columns. No filterable column, no filter row. */
  showFilters = signal(true);

  /** Two-way with the table. Seeded, so the server render already filters. */
  customerFilters = signal<DatatableFilters>({ country: { values: ['BE', 'NL'], inverse: false } });
  customerSort = signal<SortColumn[]>([{ property: 'name', direction: 'ascending' }]);
  /** The page's own query context, next to the column filters: `fetchParams`. */
  customerSearch = signal('');
  customerParams = computed<CustomerParams>(() => ({ search: this.customerSearch() }));
  customerTotal = signal<number | null>(null);

  fetchCustomers: DatatableFetch<Customer, CustomerParams> = (req) =>
    this.customerService.fetch(req).then((response) => {
      this.customerTotal.set(response.totalRecords);
      return response;
    });
  distinctsCustomers = this.customerService.distincts;
  customerKey = (row: unknown) => String((row as Customer).id);
  formatCreated = (row: unknown) => formatInstant((row as Customer).createdAt);

  customerColumns = computed<DatatableColumnDef[]>(() => {
    const filterable = this.showFilters();
    const filters = this.customerFilters();
    return [
      // No filterMode: a checkbox list of distinct names, from the API's distincts.
      { name: 'name', label: 'Name', filterable, filterSummary: valuesSummary(filters['name']) },
      { name: 'email', label: 'Email', sortable: false },
      // Custom mode: the *bsDatatableFilter template renders this panel.
      { name: 'country', label: 'Country', filterable, filterMode: 'custom', filterSummary: valuesSummary(filters['country']) },
      // A datetime comparison: typed in local time, sent as a UTC instant.
      {
        name: 'createdAt',
        label: 'Created',
        filterable,
        filterMode: 'comparison',
        filterInputType: 'datetime',
        filterOperators: ['gte', 'lt'],
        format: this.formatCreated,
        filterSummary: comparisonSummary(filters['createdAt']),
      },
    ];
  });

  protected readonly countries: DistinctValue[] = ['BE', 'NL', 'FR', 'DE', 'IT'].map((value) => ({ value, label: value }));
  protected readonly benelux = this.countries.filter((c) => ['BE', 'NL'].includes(String(c.value)));

  protected readonly snippetFilterHtml = dedent`
    <bs-datatable [virtualScroll]="true" [itemSize]="40" stateKey="customers"
      [columns]="columns()" [fetch]="fetch" [distincts]="distincts"
      [(filters)]="filters" [fetchParams]="params()" [rowKey]="rowKey">

      <!-- The escape hatch, for the column with filterMode: 'custom'. Its
           commands write the same filters model the built-in panels do. -->
      <ng-template bsDatatableFilter let-ctx="ctx">
        <button type="button" (click)="ctx.apply(benelux, false)">Benelux</button>
        <button type="button" (click)="ctx.clear()">Everywhere</button>
      </ng-template>
    </bs-datatable>
  `;

  protected readonly snippetFilterTs = dedent`
    // Two-way: the user's filters land here, and a value set here filters the table.
    filters = signal<DatatableFilters>({ country: { values: ['BE', 'NL'], inverse: false } });
    // Your own query context, sent with every request. Must be JSON.
    params = computed(() => ({ search: this.search() }));

    columns = computed<DatatableColumnDef[]>(() => [
      // A checkbox list of the column's distinct values, from [distincts].
      { name: 'name', filterable: true },
      { name: 'country', filterable: true, filterMode: 'custom' },
      // Local time in the box, a UTC instant on the wire.
      { name: 'createdAt', filterable: true, filterMode: 'comparison',
        filterInputType: 'datetime', filterOperators: ['gte', 'lt'] },
    ]);

    // The server applies { page, perPage, sortColumns, filters, params }:
    //   filters: { country: { values: ['BE','NL'], inverse: false },
    //              CreatedAt: { values: [], inverse: false, operator: 'gte',
    //                           operand: '2026-01-01T00:00:00.000Z' } }
    fetch: DatatableFetch<Customer, Params> = ({ signal, ...req }) =>
      firstValueFrom(this.http.post<DatatableFetchResponse<Customer>>('/api/customers/table', req));
    // Value lists are faceted: computed over the OTHER columns' filters.
    distincts = ({ signal, ...req }: DistinctsRequest<Params>) =>
      firstValueFrom(this.http.post<DistinctValues>('/api/customers/distincts', req));

    // stateKey: the server render fetches page 1 and hands it to the browser
    // (TransferState), so the table hydrates with rows and fetches nothing.
  `;
}

function valuesSummary(filter: DatatableFilter | undefined): string | undefined {
  if (!filter?.values.length) return undefined;
  const list = filter.values.length <= 2 ? filter.values.join(', ') : `${filter.values.length} selected`;
  return filter.inverse ? `not ${list}` : list;
}

// A fixed locale and timezone: the server render and the browser must print the
// same text, or hydration fails (and a server's timezone is rarely the reader's).
const INSTANT_FORMAT = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
const formatInstant = (iso: string) => `${INSTANT_FORMAT.format(new Date(iso))} UTC`;

function comparisonSummary(filter: DatatableFilter | undefined): string | undefined {
  if (!filter?.operator || filter.operand == null) return undefined;
  return `${OPERATOR_SYMBOLS[filter.operator]} ${formatInstant(String(filter.operand))}`;
}
