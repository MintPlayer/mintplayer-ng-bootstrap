import { Component, OnInit } from '@angular/core';
import { Color, DatatableSettings } from '@mintplayer/ng-bootstrap';
import { PaginationResponse } from '@mintplayer/ng-pagination';
import { Artist, ArtistService } from '@mintplayer/ng-client';

@Component({
  selector: 'mintplayer-ng-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'ng-bootstrap-demo';
  colors = Color;
  mode: 'slide' | 'fade' = 'slide';

  constructor(private artistService: ArtistService) {
  }

  ngOnInit() {
    this.loadArtists();
  }

  onModeChange(value: any) {
    this.mode = value;
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
