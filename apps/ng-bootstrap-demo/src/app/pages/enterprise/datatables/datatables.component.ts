import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective, BsDatatableFetch, DatatableSettings } from '@mintplayer/ng-bootstrap/datatable';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
import { Artist } from '../../../entities/artist';
import { ArtistService } from '../../../services/artist/artist.service';
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
    import { BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective, BsDatatableFetch, DatatableSettings } from '@mintplayer/ng-bootstrap/datatable';
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
}
