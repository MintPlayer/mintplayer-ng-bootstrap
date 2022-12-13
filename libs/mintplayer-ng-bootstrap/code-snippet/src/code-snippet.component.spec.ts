import { Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSnackbarService } from '@mintplayer/ng-bootstrap/snackbar';
import { BsCopyTestingModule, HighlightTestingModule } from '@mintplayer/ng-bootstrap/testing';

import { BsCodeSnippetComponent } from './code-snippet.component';

@Injectable({
  providedIn: 'root'
})
class BsSnackbarMockService {
}

describe('BsCodeSnippetComponent', () => {
  let component: BsCodeSnippetComponent;
  let fixture: ComponentFixture<BsCodeSnippetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsCopyTestingModule,
        HighlightTestingModule
      ],
      declarations: [
        // Unit to test
        BsCodeSnippetComponent,
      ],
      providers: [
        { provide: BsSnackbarService, useClass: BsSnackbarMockService }
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
