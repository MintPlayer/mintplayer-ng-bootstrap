import { ChangeDetectionStrategy, Component, effect, input, output, signal, TemplateRef, ViewChild } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCodeSnippetComponent {

  constructor() {
    effect(() => {
      const language = this.detectedLanguageValue();
      this.detectedLanguage.emit(language);
    });
  }

  offcanvasVisible = signal(false);
  codeToCopy = input<string>('');
  language = input<string>('');
  @ViewChild('copiedTemplate') copiedTemplate!: TemplateRef<any>;
  detectedLanguage = output<string>();

  detectedLanguageValue = signal<string>('code');

  copiedHtml() {
    this.offcanvasVisible.set(true);
    setTimeout(() => this.offcanvasVisible.set(false), 3000);
  }

  onHighlighted(result: HighlightResult | null) {
    this.detectedLanguageValue.set(result?.language ?? 'code');
  }

}
