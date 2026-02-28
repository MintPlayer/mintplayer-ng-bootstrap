import { ChangeDetectionStrategy, Component, effect, input, model, output, signal, TemplateRef, viewChild } from '@angular/core';
import { BsCopyDirective } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasHostComponent, BsOffcanvasContentDirective } from '@mintplayer/ng-bootstrap/offcanvas';
import { HighlightModule } from 'ngx-highlightjs';
import { HighlightResult } from 'highlight.js';

@Component({
  selector: 'bs-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss'],
  imports: [BsCopyDirective, BsOffcanvasHostComponent, BsOffcanvasContentDirective, HighlightModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCodeSnippetComponent {

  constructor() {
    effect(() => {
      const language = this.detectedLanguageValue();
      this.detectedLanguage.emit(language);
    });
  }

  offcanvasVisible = model(false);
  codeToCopy = input<string>('');
  language = input<string>('');
  readonly copiedTemplate = viewChild.required<TemplateRef<any>>('copiedTemplate');
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
