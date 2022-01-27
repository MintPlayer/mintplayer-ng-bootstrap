import { HttpClientModule } from '@angular/common/http';
import { Component, Directive, EventEmitter, Injectable, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatatableSettings } from '@mintplayer/ng-bootstrap';
import { PaginationResponse } from '@mintplayer/ng-pagination';
import { ArtistService } from '../../../services/artist/artist.service';
import { DatatablesComponent } from './datatables.component';

interface Subject {
  id: number;
  text: string;
}

interface Artist extends Subject {
  name: string;
  yearStarted: number;
  yearQuit: number;
}

interface PaginationMockRequest {
  sortProperty: string;
  sortDirection: 'ascending' | 'descending';
  perPage: number;
  page: number;
}

@Injectable({
  providedIn: 'root'
})
class ArtistMockService {
  pageArtists(request: PaginationMockRequest) {
    return new Promise((resolve, reject) => {
      resolve(<PaginationResponse<Artist>>{
        perPage: 20,
        page: 1,
        totalRecords: 200,
        totalPages: 10,
        data: []
      });
    });
  }
}

@Component({
  selector: 'bs-datatable',
  template: ``
})
class BsDatatableMockComponent {

  constructor() {
    this.settings = new DatatableSettings();
    this.settings.sortProperty = '';
    this.settings.sortDirection = 'ascending';
    this.settings.perPage = { values: [10, 20, 50], selected: 20 };
    this.settings.page = { values: [1], selected: 1 };
  }

  @Input() settings: DatatableSettings;
  @Input() data?: PaginationResponse<any>;
  @Output() reloadData: EventEmitter<any> = new EventEmitter();

}

@Directive({
  selector: '[bsDatatableColumn]'
})
class BsDatatableColumnMockDirective {
  @Input() public bsDatatableColumn: DatatableColumnMetadata = { name: '', sortable: true };
}

interface DatatableColumnMetadata {
  name: string;
  sortable: boolean;
}

describe('DatatablesComponent', () => {
  let component: DatatablesComponent;
  let fixture: ComponentFixture<DatatablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientModule
      ],
      declarations: [
        // Unit to test
        DatatablesComponent,

        // Mock dependencies
        BsDatatableMockComponent,
        BsDatatableColumnMockDirective
      ],
      providers: [
        { provide: ArtistService, useClass: ArtistMockService }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatatablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
