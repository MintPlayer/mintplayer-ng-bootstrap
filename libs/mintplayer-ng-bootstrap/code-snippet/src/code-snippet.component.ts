import { Component, EventEmitter, input, Output, signal, effect, TemplateRef, ViewChild } from '@angular/core';
import { BsCopyDirective } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { HighlightModule } from 'ngx-highlightjs';
import { HighlightResult } from 'highlight.js';

@Component({
  selector: 'bs-code-snippet',
  standalone: true,
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss'],
  imports: [BsCopyDirective, BsOffcanvasModule, HighlightModule],
})
export class BsCodeSnippetComponent {

  constructor() {
    effect(() => {
      this.detectedLanguage.emit(this.language$());
    });
  }

  offcanvasVisible = false;
  codeToCopy = input<string>('');
  language = input<string>('');
  @ViewChild('copiedTemplate') copiedTemplate!: TemplateRef<any>;
  @Output() public detectedLanguage = new EventEmitter<string>();

  language$ = signal<string>('code');

  copiedHtml() {
    this.offcanvasVisible = true;
    setTimeout(() => this.offcanvasVisible = false, 3000);
  }

  onHighlighted(result: HighlightResult | null) {
    this.language$.set(result?.language ?? 'code');
  }

}
