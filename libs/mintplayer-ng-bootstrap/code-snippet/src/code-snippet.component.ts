import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, input, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BsCopyDirective } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { HighlightModule } from 'ngx-highlightjs';
import { HighlightResult } from 'highlight.js';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'bs-code-snippet',
  standalone: true,
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss'],
  imports: [AsyncPipe, BsCopyDirective, BsOffcanvasModule, HighlightModule],
})
export class BsCodeSnippetComponent {

  constructor() {
    this.language$.pipe(takeUntilDestroyed())
      .subscribe((language) => this.detectedLanguage.emit(language));
  }

  offcanvasVisible = false;
  codeToCopy = input<string>('');
  language = input<string>('');
  @ViewChild('copiedTemplate') copiedTemplate!: TemplateRef<any>;
  @Output() public detectedLanguage = new EventEmitter<string>();

  language$ = new BehaviorSubject<string>('code');

  copiedHtml() {
    this.offcanvasVisible = true;
    setTimeout(() => this.offcanvasVisible = false, 3000);
  }

  onHighlighted(result: HighlightResult | null) {
    this.language$.next(result?.language ?? 'code');
  }

}
