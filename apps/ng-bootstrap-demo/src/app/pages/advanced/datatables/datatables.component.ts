import { Component, OnInit } from '@angular/core';
import { DatatableSettings } from '@mintplayer/ng-bootstrap';
import { Artist, ArtistService } from '@mintplayer/ng-client';
import { PaginationResponse } from '@mintplayer/ng-pagination';

@Component({
  selector: 'demo-datatables',
  templateUrl: './datatables.component.html',
  styleUrls: ['./datatables.component.scss']
})
export class DatatablesComponent implements OnInit {

  constructor(private artistService: ArtistService) {
  }

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
