import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCopyDirective } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { MockDirective, MockModule, MockProvider } from 'ng-mocks';
import { HighlightModule } from 'ngx-highlightjs';

import { BsCodeSnippetComponent } from './code-snippet.component';

describe('BsCodeSnippetComponent', () => {
  let component: BsCodeSnippetComponent;
  let fixture: ComponentFixture<BsCodeSnippetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsCopyDirective),
        MockModule(HighlightModule),
        MockModule(BsOffcanvasModule),
        
        // Unit to test
        BsCodeSnippetComponent,
      ],
      declarations: []
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
