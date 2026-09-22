import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { Color } from '@mintplayer/ng-bootstrap';
import {
  BsDatatableComponent,
  BsDatatableColumnDirective,
  BsDatatableFilterPanelDirective,
  type DistinctValue,
  type FilterChangeDetail,
  type FilterOperator,
  BsRowTemplateDirective,
  BsDatatableFetch,
  DatatableSettings,
} from '@mintplayer/ng-bootstrap/datatable';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
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
    BsDatatableComponent, BsDatatableColumnDirective, BsDatatableFilterPanelDirective, BsRowTemplateDirective,
    BsSelectComponent, BsSelectOption,
    BsCodeSnippetComponent,
    BsBadgeComponent,
    BsCheckboxComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatatablesComponent {

  protected readonly colors = Color;

  private artistService = inject(ArtistService);
  private treeItemService = inject(TreeItemService);

  mode = signal<'pagination' | 'virtualScroll'>('pagination');
  virtualScroll = computed(() => this.mode() === 'virtualScroll');

  settings = signal(new DatatableSettings({
    sortColumns: [{ property: 'YearStarted', direction: 'ascending' }],
    perPage: { values: [10, 20, 50], selected: 20 },
    page: { values: [1], selected: 1 },
  }));

  selection = signal<Artist[]>([]);

  fetchArtists: BsDatatableFetch<Artist> = (req: PaginationRequest) =>
    this.artistService.pageArtists(req).then(
      (response) => response ?? <PaginationResponse<Artist>>{ data: [], totalRecords: 0, totalPages: 1, page: req.page, perPage: req.perPage },
    );

  compareArtists = (a: Artist, b: Artist) => a.id === b.id;

  rowKey = (a: Artist) => String(a.id);

  // ─── Lazy windowed-fetch demo (real artist API, server-paged) ──────────
  // Reuses the same real, server-paged artist endpoint as the basic section.
  // The WC fetches only the pages near the viewport; the log proves it never
  // drains the whole result set.

  windowedSettings = signal(new DatatableSettings({
    sortColumns: [],
    perPage: { values: [25, 50, 100], selected: 25 },
    page: { values: [1], selected: 1 },
  }));

  /** Pages actually fetched — proof that scrolling drives O(visible/perPage) requests, not a full drain. */
  windowedFetchedPages = signal<number[]>([]);

  fetchWindowedArtists: BsDatatableFetch<Artist> = async (req: PaginationRequest) => {
    this.windowedFetchedPages.update((pages) =>
      pages.includes(req.page) ? pages : [...pages, req.page].sort((a, b) => a - b),
    );
    const response = await this.artistService.pageArtists(req);
    return response ?? <PaginationResponse<Artist>>{ data: [], totalRecords: 0, totalPages: 1, page: req.page, perPage: req.perPage };
  };

  // ─── Tree-mode demo ────────────────────────────────────────────────────

  treeSettings = signal(new DatatableSettings({
    sortColumns: [],
    perPage: { values: [50, 100, 200], selected: 100 },
    page: { values: [1], selected: 1 },
  }));

  treeExpanded = signal<Set<unknown>>(new Set());
  treeSelection = signal<TreeItem[]>([]);

  fetchTreeItems: BsDatatableFetch<TreeItem> = this.treeItemService.fetch;

  treeRowKey = (item: TreeItem) => String(item.id);
  treeIdKey: keyof TreeItem = 'id';
  treeChildCountKey: keyof TreeItem = 'childCount';
  compareTreeItems = (a: TreeItem, b: TreeItem) => a.id === b.id;

  protected readonly snippetBasicHtml = dedent`
    <bs-datatable
      [fetch]="fetchArtists"
      [(settings)]="settings">
      <div *bsDatatableColumn="'Name'">Artist</div>
      <div *bsDatatableColumn="'YearStarted'">Year started</div>
      <div *bsDatatableColumn="'YearQuit'">Year quit</div>

      <ng-container *bsRowTemplate="let artist">
        <td class="text-nowrap">{{ artist?.name }}</td>
        <td class="text-nowrap">{{ artist?.yearStarted }}</td>
        <td class="text-nowrap">{{ artist?.yearQuit }}</td>
      </ng-container>
    </bs-datatable>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, inject, signal } from '@angular/core';
    import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
    import {
      BsDatatableComponent,
      BsDatatableColumnDirective,
      BsRowTemplateDirective,
      BsDatatableFetch,
      DatatableSettings,
    } from '@mintplayer/ng-bootstrap/datatable';
    import { Artist } from './artist';
    import { ArtistService } from './artist.service';

    @Component({
      selector: 'my-artists',
      templateUrl: './my-artists.component.html',
      imports: [
        BsDatatableComponent,
        BsDatatableColumnDirective,
        BsRowTemplateDirective,
      ],
    })
    export class MyArtistsComponent {
      private artistService = inject(ArtistService);

      settings = signal(new DatatableSettings({
        perPage: { values: [10, 20, 50], selected: 20 },
        page: { values: [1], selected: 1 },
      }));

      fetchArtists: BsDatatableFetch<Artist> = (req: PaginationRequest) =>
        this.artistService.pageArtists(req).then(
          (response) => response ?? <PaginationResponse<Artist>>{
            data: [], totalRecords: 0, totalPages: 1, page: req.page, perPage: req.perPage,
          },
        );
    }
  `;

  protected readonly snippetSortableHtml = dedent`
    <!-- Add ; sortable: true to any column to enable click-to-sort headers.
         The fetch callback receives req.sortColumns in its PaginationRequest. -->
    <bs-datatable [fetch]="fetchArtists" [(settings)]="settings">
      <div *bsDatatableColumn="'Name'; sortable: true">Artist</div>
      <div *bsDatatableColumn="'YearStarted'; sortable: true">Year started</div>
      <div *bsDatatableColumn="'YearQuit'; sortable: true">Year quit</div>

      <ng-container *bsRowTemplate="let artist">
        <td>{{ artist?.name }}</td>
        <td>{{ artist?.yearStarted }}</td>
        <td>{{ artist?.yearQuit }}</td>
      </ng-container>
    </bs-datatable>
  `;

  protected readonly snippetSelectionHtml = dedent`
    <!-- selectionMode = 'single' | 'multiple' | 'none'.
         Provide [rowKey] so selection survives paging / re-fetch. -->
    <bs-datatable
      [fetch]="fetchArtists"
      [(settings)]="settings"
      selectionMode="multiple"
      [rowKey]="rowKey"
      [(selection)]="selection">
      <!-- columns + row template as above -->
    </bs-datatable>
  `;

  protected readonly snippetSelectionTs = dedent`
    selection = signal<Artist[]>([]);
    rowKey = (a: Artist) => String(a.id);
  `;

  protected readonly snippetWindowedHtml = dedent`
    <!-- Virtual + fetch: the table fetches only the pages whose rows are in
         (or near) the viewport, keyed by settings.perPage. Placeholder rows
         (isPlaceholder) hold the scroll position until each window arrives.
         The public [fetch] contract is unchanged — no new callback. -->
    <bs-datatable
      [virtualScroll]="true"
      [itemSize]="40"
      [fetch]="fetchWindowedArtists"
      [(settings)]="windowedSettings"
      [rowKey]="rowKey">

      <div *bsDatatableColumn="'Name'">Artist</div>
      <div *bsDatatableColumn="'YearStarted'">Year started</div>
      <div *bsDatatableColumn="'YearQuit'">Year quit</div>

      <ng-container *bsRowTemplate="let artist; let isPlaceholder = isPlaceholder">
        @if (isPlaceholder) {
          <td colspan="3" class="text-muted small fst-italic">Loading…</td>
        } @else {
          <td>{{ artist?.name }}</td>
          <td>{{ artist?.yearStarted }}</td>
          <td>{{ artist?.yearQuit }}</td>
        }
      </ng-container>
    </bs-datatable>
  `;

  protected readonly snippetWindowedTs = dedent`
    // The same [fetch] callback as paginated/non-virtual mode — page + perPage.
    // In flat virtual mode the table calls it once per *needed page* as the
    // user scrolls, instead of draining every page up front.
    windowedSettings = signal(new DatatableSettings({
      perPage: { values: [25, 50, 100], selected: 25 },
      page: { values: [1], selected: 1 },
    }));

    fetchWindowedArtists: BsDatatableFetch<Artist> = (req: PaginationRequest) =>
      this.artistService.pageArtists(req); // resolves PaginationResponse<Artist>
  `;

  protected readonly snippetTreeHtml = dedent`
    <!-- Tree mode: virtual scrolling composes with nested expandable rows.
         Each expanded row's children load lazily on demand; placeholders
         reserve viewport space until the children arrive so the scrollbar
         stays accurate. -->
    <bs-datatable class="flex-grow-1"
      [virtualScroll]="true"
      [itemSize]="40"
      [tree]="true"
      [idKey]="treeIdKey"
      [childCountKey]="treeChildCountKey"
      [fetch]="fetchTreeItems"
      [(settings)]="treeSettings"
      [(expandedIds)]="treeExpanded"
      [rowKey]="treeRowKey"
      [compareWith]="compareTreeItems"
      selectionMode="multiple"
      selectionStrategy="cascading"
      [(selection)]="treeSelection">

      <div *bsDatatableColumn="'name'; sortable: true">Name</div>
      <div *bsDatatableColumn="'code'; sortable: true">Code</div>
      <div *bsDatatableColumn="'headcount'; sortable: true">Headcount</div>

      <ng-container *bsRowTemplate="let item; let isPlaceholder = isPlaceholder">
        @if (isPlaceholder) {
          <td colspan="3" class="text-muted small fst-italic">Loading…</td>
        } @else {
          <td class="text-nowrap">{{ item?.name }}</td>
          <td class="text-nowrap font-monospace small">{{ item?.code }}</td>
          <td class="text-nowrap">{{ item?.headcount }}</td>
        }
      </ng-container>
    </bs-datatable>
  `;

  protected readonly snippetTreeTs = dedent`
    import { Component, inject, signal } from '@angular/core';
    import { PaginationRequest } from '@mintplayer/pagination';
    import {
      BsDatatableComponent,
      BsDatatableColumnDirective,
      BsRowTemplateDirective,
      BsDatatableFetch,
      BsDatatableFetchRequest,
      DatatableSettings,
    } from '@mintplayer/ng-bootstrap/datatable';
    import { TreeItem } from './tree-item';
    import { TreeItemService } from './tree-item.service';

    @Component({
      selector: 'org-tree',
      templateUrl: './org-tree.component.html',
      imports: [
        BsDatatableComponent,
        BsDatatableColumnDirective,
        BsRowTemplateDirective,
      ],
    })
    export class OrgTreeComponent {
      private treeItemService = inject(TreeItemService);

      treeSettings = signal(new DatatableSettings({
        perPage: { values: [50, 100, 200], selected: 100 },
        page: { values: [1], selected: 1 },
      }));

      treeExpanded = signal<Set<unknown>>(new Set());
      treeSelection = signal<TreeItem[]>([]);

      // Single callback for both roots and children — branches on parentId.
      fetchTreeItems: BsDatatableFetch<TreeItem> = this.treeItemService.fetch;

      treeRowKey = (item: TreeItem) => String(item.id);
      treeIdKey: keyof TreeItem = 'id';
      treeChildCountKey: keyof TreeItem = 'childCount';
      compareTreeItems = (a: TreeItem, b: TreeItem) => a.id === b.id;
    }
  `;

  protected readonly snippetTreeServiceTs = dedent`
    // tree-item.service.ts — branches on req.parentId for roots vs children.
    @Injectable({ providedIn: 'root' })
    export class TreeItemService {
      private readonly http = inject(HttpClient);

      fetch: BsDatatableFetch<TreeItem> = async (req: BsDatatableFetchRequest) => {
        const url = req.parentId == null
          ? '/api/treeItems'
          : \`/api/treeItems/\${req.parentId}/children\`;
        const params = new HttpParams()
          .set('page', String(req.page ?? 1))
          .set('perPage', String(req.perPage ?? 50));
        // ... map PagedResult<TreeItem> → PaginationResponse<TreeItem>
        return firstValueFrom(this.http.get<PagedResult<TreeItem>>(url, { params }))
          .then(r => ({ data: r.items, totalRecords: r.totalCount, ... }));
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

  filterSettings = signal(new DatatableSettings({
    sortColumns: [{ property: 'name', direction: 'ascending' }],
    perPage: { values: [10, 20, 50], selected: 20 },
    page: { values: [1], selected: 1 },
  }));

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

    <bs-datatable [data]="filteredArtists()" [(settings)]="settings" [rowKey]="rowKey"
      (filterChange)="onFilterChange($event)">

      <!-- Default: a checkbox list of the column's distinct values, with
           search, include/exclude and clear. No template, no wiring. -->
      <div *bsDatatableColumn="'name';
            filterable: showFilters();
            filterActive: nameSelection().length > 0;
            filterSummary: nameSummary()">
        Artist
      </div>

      <!-- Comparison mode: an operator and one number. The right shape for a
           quantity — ticking forty individual years is not a filter. -->
      <div *bsDatatableColumn="'yearStarted';
            filterable: showFilters();
            filterMode: 'comparison';
            filterInputType: 'number';
            filterActive: yearOperand() !== null;
            filterSummary: yearSummary()">
        Year started
      </div>

      <!-- The escape hatch, nested INSIDE the column it belongs to. Style this
           markup yourself: it is your DOM, the component never touches it, and
           .form-control is only styled inside bs-* components here. -->
      <div *bsDatatableColumn="'yearQuit'; filterable: showFilters()">
        Year quit
        <ng-container *bsDatatableFilterPanel="let values">
          <div class="demo-filter-panel">
            <label class="demo-filter-check">
              <input type="checkbox" [ngModel]="activeOnly()" (ngModelChange)="activeOnly.set($event)" />
              <span>Still active only</span>
            </label>
          </div>
        </ng-container>
      </div>
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

    // filterActive and filterSummary are yours too: the component never derives
    // them, because only you know what your filter did.
  `;
}
