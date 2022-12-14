import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridTestingModule, BsSnackbarTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { SnackbarComponent } from './snackbar.component';

describe('SnackbarComponent', () => {
  let component: SnackbarComponent;
  let fixture: ComponentFixture<SnackbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
        BsSnackbarTestingModule
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
