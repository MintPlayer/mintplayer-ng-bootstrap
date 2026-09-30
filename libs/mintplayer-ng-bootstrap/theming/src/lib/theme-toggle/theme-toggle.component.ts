import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';
import {
  BS_THEME_DEFAULT_MODES,
  MpThemeToggle,
  type BsThemeToggleMode,
} from '@mintplayer/web-components/theming';

// Load-bearing: referencing the class keeps the module (and its
// customElements.define) from being tree-shaken out of the bundle.
void MpThemeToggle;

/**
 * Angular wrapper around `<mp-theme-toggle>` (PRD dark-mode D7): a button that
 * cycles the document's colour mode. The element talks to the theme store
 * directly, so `BsThemeService` signals follow every click with no wiring here.
 *
 * `modes` is the cycle, in order (default `BS_THEME_DEFAULT_MODES`). Localize it
 * by mapping over the default and overriding `label` / `announcement`.
 *
 * A consumer's `aria-*`, `role`, `id` and `tabindex` on `<bs-theme-toggle>`
 * reach the `<mp-theme-toggle>` element through `bsForwardAria`.
 *
 * no-JS: none (control requires script).
 */
@Component({
  selector: 'bs-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styles: `:host { display: inline-block; }`,
  imports: [BsForwardAriaDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsThemeToggleComponent {
  readonly modes = input<readonly BsThemeToggleMode[]>(BS_THEME_DEFAULT_MODES);

  private readonly toggleRef = viewChild.required<ElementRef<MpThemeToggle>>('toggle');

  constructor() {
    effect(() => {
      this.toggleRef().nativeElement.modes = this.modes();
    });
  }
}
