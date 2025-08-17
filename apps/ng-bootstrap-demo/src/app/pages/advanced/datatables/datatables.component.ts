import { Component, inject, OnInit } from '@angular/core';
import { BsDatatableModule, DatatableSettings } from '@mintplayer/ng-bootstrap/datatable';
import { PaginationResponse } from '@mintplayer/pagination';
import { Artist } from '../../../entities/artist';
import { ArtistService } from '../../../services/artist/artist.service';

@Component({
  selector: 'demo-datatables',
  templateUrl: './datatables.component.html',
  styleUrls: ['./datatables.component.scss'],
  standalone: true,
  imports: [BsDatatableModule],
})
export class DatatablesComponent implements OnInit {

  artistService = inject(ArtistService);

  artists?: PaginationResponse<Artist>;
  settings: DatatableSettings = new DatatableSettings({
    sortProperty: 'YearStarted',
    sortDirection: 'ascending',
    perPage: {
      values: [10, 20, 50],
      selected: 20
    },
    page: {
      values: [1],
      selected: 1
    }
  });
  
  ngOnInit() {
    this.loadArtists();
  }

  loadArtists() {
    this.artistService.pageArtists(this.settings.toPagination())
      .then((response) => {
        this.artists = response;
        if (response) {
          this.settings.page.values = Array.from(Array(response.totalPages).keys()).map((p) => p + 1);
        }
      });
  }

}
