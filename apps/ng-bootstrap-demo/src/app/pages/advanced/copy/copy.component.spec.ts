import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCopyDirective } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { MockDirective, MockModule } from 'ng-mocks';
import { Highlight, HighlightModule, provideHighlightOptions } from 'ngx-highlightjs';
import { CopyComponent } from './copy.component';

describe('CopyComponent', () => {
  let component: CopyComponent;
  let fixture: ComponentFixture<CopyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsCopyDirective),
        MockModule(BsOffcanvasModule),
        // MockModule(HighlightModule),
        MockDirective(Highlight),
        // Highlight,
      ],
      declarations: [
        // Unit to test
        CopyComponent,
      ],
      providers: [
        provideHighlightOptions({
          fullLibraryLoader: () => import('highlight.js'),
        }),
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
