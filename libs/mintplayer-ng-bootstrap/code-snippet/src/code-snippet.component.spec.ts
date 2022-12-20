import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCopyModule } from '@mintplayer/ng-bootstrap/copy';
import { BsSnackbarModule, BsSnackbarService } from '@mintplayer/ng-bootstrap/snackbar';
import { MockModule, MockProvider } from 'ng-mocks';
import { HighlightModule } from 'ngx-highlightjs';

import { BsCodeSnippetComponent } from './code-snippet.component';

describe('BsCodeSnippetComponent', () => {
  let component: BsCodeSnippetComponent;
  let fixture: ComponentFixture<BsCodeSnippetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsCopyModule),
        MockModule(HighlightModule),
        MockModule(BsSnackbarModule),
      ],
      declarations: [
        // Unit to test
        BsCodeSnippetComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsCodeSnippetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
