import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSnackbarModule } from '@mintplayer/ng-bootstrap/snackbar';
import { MockModule } from 'ng-mocks';
import { SnackbarComponent } from './snackbar.component';

describe('SnackbarComponent', () => {
  let component: SnackbarComponent;
  let fixture: ComponentFixture<SnackbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridModule),
        MockModule(BsSnackbarModule),
      ],
      declarations: [
        // Unit to test
        SnackbarComponent,
      ],
      providers: [
        { provide: 'GIT_REPO', useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/apps/ng-bootstrap-demo/src/app/' },
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SnackbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
