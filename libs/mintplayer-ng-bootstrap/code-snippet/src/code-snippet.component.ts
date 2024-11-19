import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BsCopyDirective } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { HighlightAutoResult, HighlightModule } from 'ngx-highlightjs';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'bs-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss'],
  imports: [AsyncPipe, BsCopyDirective, BsOffcanvasModule, HighlightModule]
})
export class BsCodeSnippetComponent {

  constructor() {
    this.language$.pipe(takeUntilDestroyed())
      .subscribe((language) => this.detectedLanguage.emit(language));
  }

  offcanvasVisible = false;
  @Input() public codeToCopy = '';
  @Input() public languages: string[] | null = null;
  @Input() public lineNumbers = false;
  @ViewChild('copiedTemplate') copiedTemplate!: TemplateRef<any>;
  @Output() public detectedLanguage = new EventEmitter<string>();

  language$ = new BehaviorSubject<string>('code');

  copiedHtml() {
    this.offcanvasVisible = true;
    setTimeout(() => this.offcanvasVisible = false, 3000);
  }

  onHighlighted(result: HighlightAutoResult) {
    this.language$.next(result.language ?? 'code');
  }

}
