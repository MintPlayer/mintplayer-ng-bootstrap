import { ChangeDetectionStrategy, Component, effect, inject, input, model, output, signal, TemplateRef, viewChild } from '@angular/core';
import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';
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
  private announcer = inject(BsLiveAnnouncerService);

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
    this.announcer.announce('Copied to clipboard');
    this.offcanvasVisible.set(true);
    setTimeout(() => this.offcanvasVisible.set(false), 3000);
  }

  onHighlighted(result: HighlightResult | null) {
    this.detectedLanguageValue.set(result?.language ?? 'code');
  }

}
