import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsPaginationModule } from '@mintplayer/ng-bootstrap/pagination';
import { MockModule } from 'ng-mocks';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsPaginationModule),
      ],
      declarations: [
        // Unit to test
        PaginationComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
