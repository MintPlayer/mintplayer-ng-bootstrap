import { Directive, Injectable, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSnackbarService } from '../snackbar/service/snackbar.service';

import { BsCodeSnippetComponent } from './code-snippet.component';

@Injectable({
  providedIn: 'root'
})
class BsSnackbarMockService {
}

@Directive({
  selector: '[bsCopy]'
})
class BsCopyMockDirective {
  @Input() bsCopy!: string;
}

@Directive({
  selector: '[highlight]'
})
class HighlightMockDirective {
  @Input() highlight!: string;
}

describe('BsCodeSnippetComponent', () => {
  let component: BsCodeSnippetComponent;
  let fixture: ComponentFixture<BsCodeSnippetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsCodeSnippetComponent,

        // Mock dependencies
        BsCopyMockDirective,
        HighlightMockDirective
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
