import { computed, Directive, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Directive({
  selector: 'button[color],input[type="button"][color],input[type="submit"][color],a[color]',
  host: {
    '[class.btn]': 'true',
    '[class]': 'buttonClass()',
  },
})
export class BsButtonTypeDirective {
  readonly color = input<Color | undefined>(undefined);

  /** Derived, not written from an effect: clearing the colour must restore the transparent style. */
  readonly buttonClass = computed(() => {
    const value = this.color();
    return value === undefined ? 'btn-transparent' : `btn-${Color[value]}`;
  });
}
