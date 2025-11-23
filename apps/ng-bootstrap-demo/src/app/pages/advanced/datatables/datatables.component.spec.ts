import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDatatableComponent } from '@mintplayer/ng-bootstrap/datatable';
import { MockModule, MockProvider } from 'ng-mocks';
import { ArtistService } from '../../../services/artist/artist.service';
import { DatatablesComponent } from './datatables.component';

describe('DatatablesComponent', () => {
  let component: DatatablesComponent;
  let fixture: ComponentFixture<DatatablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        MockModule(BsDatatableComponent),
      ],
      declarations: [
        // Unit to test
        DatatablesComponent,
      ],
      providers: [
        ArtistService,
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
