import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCopyDirective } from '@mintplayer/ng-bootstrap/copy';
import { MockDirective, MockModule, MockComponent } from 'ng-mocks';
import { HighlightModule, HighlightLoader, HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';

import { BsCodeSnippetComponent } from './code-snippet.component';
import { BsOffcanvasHostComponent } from '@mintplayer/ng-bootstrap/offcanvas';
import { BsOffcanvasContentDirective } from '@mintplayer/ng-bootstrap/offcanvas';

// Mock the highlight loader to prevent the "Highlight.js library was not imported!" error
class MockHighlightLoader {
  ready = Promise.resolve({
    highlight: () => ({ value: '', language: 'plaintext' }),
    highlightAuto: () => ({ value: '', language: 'plaintext' }),
    listLanguages: () => [],
  });
}

describe('BsCodeSnippetComponent', () => {
  let component: BsCodeSnippetComponent;
  let fixture: ComponentFixture<BsCodeSnippetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsCopyDirective),
        MockComponent(BsOffcanvasHostComponent), MockDirective(BsOffcanvasContentDirective),
        MockModule(HighlightModule),

        // Unit to test
        BsCodeSnippetComponent,
      ],
      providers: [
        { provide: HighlightLoader, useClass: MockHighlightLoader },
        {
          provide: HIGHLIGHT_OPTIONS,
          useValue: {
            fullLibraryLoader: () => Promise.resolve({ default: {} }),
          },
        },
      ],
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
