import { JsonPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Color, DatatableSettings, Position } from '@mintplayer/ng-bootstrap';
import { PaginationResponse } from '@mintplayer/ng-pagination';
import { Artist, ArtistService } from '@mintplayer/ng-client';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'mintplayer-ng-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'ng-bootstrap-demo';
  colors = Color;
  mode: 'slide' | 'fade' = 'slide';
  multiselectItems = ['Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink'];

  constructor(private artistService: ArtistService, private jsonPipe: JsonPipe) {
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

  tooltipPosition = Position;

  items: any[] = [
    { id: 1, firstName: 'Michael', lastName: 'Jackson', text: 'Michael Jackson' },
    { id: 2, firstName: 'Paul', lastName: 'Spencer', text: 'Paul Spencer' },
    { id: 3, firstName: 'Noel', lastName: 'Gallagher', text: 'Noel Gallagher' },
    { id: 4, firstName: 'Chris', lastName: 'Martin', text: 'Chris Martin' }
  ];
  searchterm: string = '';
  suggestions$ = new BehaviorSubject<any[]>([]);
  provideSuggestions(searchTerm: string) {
    this.suggestions$.next(this.items.filter(i => (i.firstName + ' ' + i.lastName).indexOf(searchTerm) > -1));
  }
  gotoArtist(suggestion: any) {
    alert('Selected value:\r\n' + this.jsonPipe.transform(suggestion));
  }
  doSearch(searchTerm: string) {
    alert(`Search for ${searchTerm} now`);
  }

}
