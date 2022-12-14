import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCopyTestingModule, BsSnackbarTestingModule, HighlightTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { CopyComponent } from './copy.component';

describe('CopyComponent', () => {
  let component: CopyComponent;
  let fixture: ComponentFixture<CopyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsCopyTestingModule,
        BsSnackbarTestingModule,
        HighlightTestingModule
      ],
      declarations: [
        // Unit to test
        CopyComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CopyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
