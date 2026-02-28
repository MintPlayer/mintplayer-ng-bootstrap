import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { MockComponent } from 'ng-mocks';
import { CodeSnippetComponent } from './code-snippet.component';

describe('CodeSnippetComponent', () => {
  let component: CodeSnippetComponent;
  let fixture: ComponentFixture<CodeSnippetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsCodeSnippetComponent),
        CodeSnippetComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeSnippetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
