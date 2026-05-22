import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
import '@mintplayer/web-components/code-snippet';

/**
 * Angular wrapper around `<mp-code-snippet>`. The WC owns the
 * highlighting, copy-to-clipboard, and copied-toast behaviour. This
 * component just translates Angular input/output ergonomics into the
 * underlying WC's properties and events.
 *
 * Breaking changes vs the pre-WC `BsCodeSnippetComponent`:
 * - `offcanvasVisible` (model) and `copiedTemplate` (viewChild) are
 *   removed. The WC manages its own toast; consumers no longer need —
 *   or can override — the copied indicator. Drop these inputs from
 *   consumer templates.
 * - The copy + toast UI is rendered in the WC's shadow DOM; CSS
 *   overrides via `::part(copy-button)`, `::part(toast)`, `::part(pre)`,
 *   `::part(code)`.
 */
@Component({
  selector: 'bs-code-snippet',
  templateUrl: './code-snippet.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-block' },
})
export class BsCodeSnippetComponent {
  readonly codeToCopy = input<string>('');
  readonly language = input<string>('');
  readonly detectedLanguage = output<string>();

  protected onLanguageDetected(event: Event): void {
    const detail = (event as CustomEvent<{ language: string }>).detail;
    this.detectedLanguage.emit(detail.language);
  }
}
