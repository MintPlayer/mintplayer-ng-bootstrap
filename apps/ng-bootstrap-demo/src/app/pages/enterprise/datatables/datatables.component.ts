import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import {
  BsDatatableComponent,
  BsDatatableColumnDirective,
  BsRowTemplateDirective,
  BsDatatableFetch,
  DatatableSettings,
} from '@mintplayer/ng-bootstrap/datatable';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
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
    BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective,
    BsSelectComponent, BsSelectOption,
    BsCodeSnippetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatatablesComponent {

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
}
