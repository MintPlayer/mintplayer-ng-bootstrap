import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { Color } from '@mintplayer/ng-bootstrap';
import {
  BsDatatableComponent,
  BsDatatableColumnDirective,
  BsDatatableFilterDirective,
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

@Component({
  selector: 'demo-datatables',
  templateUrl: './datatables.component.html',
  styleUrls: ['./datatables.component.scss'],
  imports: [
    FormsModule,
    BsDatatableComponent, BsDatatableColumnDirective, BsDatatableFilterDirective, BsRowTemplateDirective,
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
  // The filter row carries no state of its own. These signals belong to the
  // page, and the datatable only re-fetches because `fetchFilteredArtists`
  // reads them — which is exactly why the same row can drive a text match, a
  // numeric range or a server-side query without the component knowing.

  /**
   * Toggles the `*bsDatatableFilter` templates in and out of the content.
   * With none present no column is filterable, so the second header row is not
   * rendered at all — the row is a consequence of the templates, not a flag.
   */
  showFilters = signal(true);

  nameFilter = signal('');
  minYear = signal<number | null>(null);

  filterSettings = signal(new DatatableSettings({
    sortColumns: [{ property: 'Name', direction: 'ascending' }],
    perPage: { values: [10, 20, 50], selected: 20 },
    page: { values: [1], selected: 1 },
  }));

  setNameFilter(value: string) {
    this.nameFilter.set(value ?? '');
    this.resetFilterPage();
  }

  setMinYear(value: number | null) {
    this.minYear.set(value === null || Number.isNaN(value) ? null : Number(value));
    this.resetFilterPage();
  }

  /** A narrowed result set has fewer pages; staying on page 7 would show nothing. */
  private resetFilterPage() {
    const current = this.filterSettings();
    this.filterSettings.set(new DatatableSettings({
      sortColumns: current.sortColumns,
      perPage: current.perPage,
      page: { values: current.page.values, selected: 1 },
    }));
  }

  fetchFilteredArtists: BsDatatableFetch<Artist> = (req: PaginationRequest) =>
    this.artistService.pageArtists(req).then((response) => {
      const all = response?.data ?? [];
      const name = this.nameFilter().trim().toLowerCase();
      const min = this.minYear();
      const filtered = all
        .filter((a) => (name ? (a.name ?? '').toLowerCase().includes(name) : true))
        .filter((a) => (min === null ? true : (a.yearStarted ?? 0) >= min));
      // Client-side here only because the demo API has no filter endpoint; a
      // real consumer would pass these into the request instead.
      return <PaginationResponse<Artist>>{
        data: filtered,
        totalRecords: filtered.length,
        totalPages: 1,
        page: req.page,
        perPage: req.perPage,
      };
    });

  protected readonly snippetFilterHtml = dedent`
    <!-- The filter row follows the templates: remove them all and it is gone. -->
    <bs-checkbox [type]="'checkbox'" [(ngModel)]="showFilters">Show the filter row</bs-checkbox>

    <bs-datatable [fetch]="fetchFilteredArtists" [(settings)]="settings" [rowKey]="rowKey">
      <div *bsDatatableColumn="'Name'">Artist</div>
      <div *bsDatatableColumn="'YearStarted'">Year started</div>
      <div *bsDatatableColumn="'YearQuit'; sortable: false">Year quit</div>

      @if (showFilters()) {
      <!-- Adding this grows a second header row. Columns without a filter
           template get an empty, correctly-sized cell. -->
      <div *bsDatatableFilter="'Name'; active: nameFilter().length > 0">
        <label class="form-label small mb-1" for="filter-name">Name contains</label>
        <input id="filter-name" class="form-control form-control-sm" type="search"
          [ngModel]="nameFilter()" (ngModelChange)="setNameFilter($event)" />
      </div>

      <div *bsDatatableFilter="'YearStarted'; active: minYear() !== null">
        <label class="form-label small mb-1" for="filter-year">Started after</label>
        <input id="filter-year" class="form-control form-control-sm" type="number"
          [ngModel]="minYear()" (ngModelChange)="setMinYear($event)" />
      </div>
      }
    </bs-datatable>
  `;

  protected readonly snippetFilterTs = dedent`
    // The component holds no filter state and defines no predicate model.
    // These signals are the page's; the table re-fetches only because the
    // fetch callback reads them.
    nameFilter = signal('');
    minYear = signal<number | null>(null);

    setNameFilter(value: string) {
      this.nameFilter.set(value ?? '');
      this.resetFilterPage();   // a narrower result set has fewer pages
    }

    fetchFilteredArtists: BsDatatableFetch<Artist> = (req) =>
      this.artistService.pageArtists(req).then((response) => {
        const name = this.nameFilter().trim().toLowerCase();
        const min = this.minYear();
        const filtered = (response?.data ?? [])
          .filter(a => name ? (a.name ?? '').toLowerCase().includes(name) : true)
          .filter(a => min === null ? true : (a.yearStarted ?? 0) >= min);
        return { data: filtered, totalRecords: filtered.length, totalPages: 1,
                 page: req.page, perPage: req.perPage };
      });

    // \`*bsDatatableFilterActive\` is purely visual — it dots the trigger so a
    // collapsed panel still shows the column is filtered. What "active" means
    // is yours.
  `;
}
