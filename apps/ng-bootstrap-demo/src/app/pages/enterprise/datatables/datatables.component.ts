import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import {
  BsDatatableComponent,
  BsDatatableFetch,
  DatatableSettings,
  type DatatableColumnDef,
} from '@mintplayer/ng-bootstrap/datatable';
import { Artist } from '../../../entities/artist';
import { ArtistService } from '../../../services/artist/artist.service';

@Component({
  selector: 'demo-datatables',
  templateUrl: './datatables.component.html',
  styleUrls: ['./datatables.component.scss'],
  imports: [FormsModule, BsDatatableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatatablesComponent {

  private artistService = inject(ArtistService);

  settings = signal(new DatatableSettings({
    sortColumns: [{ property: 'YearStarted', direction: 'ascending' }],
    perPage: { values: [10, 20, 50], selected: 20 },
    page: { values: [1], selected: 1 },
  }));

  selection = signal<Artist[]>([]);

  columns = computed<DatatableColumnDef<Artist>[]>(() => [
    { name: 'Name', label: 'Artist', cellRenderer: (r) => r.name ?? '', cellClass: 'text-nowrap' },
    { name: 'YearStarted', label: 'Year started', cellRenderer: (r) => r.yearStarted?.toString() ?? '', cellClass: 'text-nowrap' },
    { name: 'YearQuit', label: 'Year quit', cellRenderer: (r) => r.yearQuit?.toString() ?? '', cellClass: 'text-nowrap' },
  ]);

  fetchArtists: BsDatatableFetch<Artist> = (req: PaginationRequest) =>
    this.artistService.pageArtists(req).then(
      (response) => response ?? <PaginationResponse<Artist>>{ data: [], totalRecords: 0, totalPages: 1, page: req.page, perPage: req.perPage },
    );

  rowKey = (a: Artist) => String(a.id);
}
