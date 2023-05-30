import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCopyModule } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
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
        MockModule(BsOffcanvasModule),
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
