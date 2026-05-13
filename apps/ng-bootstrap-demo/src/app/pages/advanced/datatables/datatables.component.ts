import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective, BsDatatableFetch, DatatableSettings } from '@mintplayer/ng-bootstrap/datatable';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
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
}
