import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
// Side-effect import registers <mp-card>.
import '@mintplayer/web-components/card';

/**
 * Angular wrapper for the Bootstrap card root.
 *
 * Renders an inner `<mp-card>` — the single card web component, which owns the
 * card chrome (border / radius / background) in its shadow DOM. Projected
 * `<bs-card-*>` content lands in `<mp-card>`'s default slot and is styled via
 * the WC's `::slotted()` rules (header / body / footer / img) plus the global
 * typography sheet (title / text). This is what makes the card render
 * correctly even when itself slotted inside another web component.
 */
@Component({
  selector: 'bs-card',
  template: `<mp-card [attr.color]="colorName()" [attr.outline]="outline() ? '' : null"><ng-content></ng-content></mp-card>`,
  styles: [':host { display: block; }'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardComponent {
  readonly color = input<Color | undefined>(undefined);
  readonly outline = input(false);

  protected readonly colorName = computed(() => {
    const c = this.color();
    return c === undefined ? null : Color[c];
  });
}
