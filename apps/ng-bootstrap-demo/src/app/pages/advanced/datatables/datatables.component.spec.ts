import { HttpClientModule } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDatatableTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { PaginationResponse } from '@mintplayer/pagination';
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

describe('DatatablesComponent', () => {
  let component: DatatablesComponent;
  let fixture: ComponentFixture<DatatablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        BsDatatableTestingModule
      ],
      declarations: [
        // Unit to test
        DatatablesComponent,
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
