import { JsonPipe } from '@angular/common';
import { Component, OnInit, TemplateRef } from '@angular/core';
import { BsModalComponent, BsModalService, BsSnackbarComponent, BsSnackbarService, Color, DatatableSettings, FileUpload, Position } from '@mintplayer/ng-bootstrap';
import { PaginationResponse } from '@mintplayer/ng-pagination';
import { Artist, ArtistService, SubjectService, SubjectType, Tag, TagService } from '@mintplayer/ng-client';
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
  darkMode: boolean | null = true;

  constructor(
    private artistService: ArtistService,
    private subjectService: SubjectService,
    private tagService: TagService,
    private jsonPipe: JsonPipe,
    private snackbarService: BsSnackbarService,
    private modalService: BsModalService
  ) { }
  
  ngOnInit() {
    this.loadArtists();
  }

  onModeChange(value: any) {
    this.mode = value;
  }


  artistSuggestions: Artist[] = [];
  onProvideArtistSuggestions(search: string) {
    this.subjectService.suggest(search, [SubjectType.artist]).then((artists) => {
      this.artistSuggestions = <Artist[]>artists;
    })
  }
  tagSuggestions: Tag[] = [];
  onProvideTagSuggestions(search: string) {
    this.tagService.suggestTags(search, true).then((tags) => {
      if (tags) {
        this.tagSuggestions = tags;
      }
    })
  }

  modal: BsModalComponent | null = null;
  showModal(template: TemplateRef<any>) {
    this.modal = this.modalService.show(template);
  }

  snackbar: BsSnackbarComponent | null = null;
  showSnackbar(template: TemplateRef<any>) {
     this.snackbar = this.snackbarService.show(template);
  }
  hideSnackbar() {
    if (this.snackbar) {
      this.snackbarService.hide(this.snackbar);
    }
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

  logFilesForUpload(files: FileUpload[]) {
    console.log('Now we must upload following files to the server', files);
    files.forEach((upload) => {
      this.incrementProgress(upload);
    });
  }
  incrementProgress(file: FileUpload) {
    if (file.progress < file.file.size) {
      file.progress += 10;
      setTimeout(() => {
        this.incrementProgress(file);
      }, 1000);
    }
  }

  files: FileUpload[] = [];
  removeFile(file: FileUpload) {
    this.files.splice(this.files.indexOf(file), 1);
  }
}
