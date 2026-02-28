import { Directive, effect, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Directive({
  selector: 'button[color],input[type="button"][color],input[type="submit"][color],a[color]',
  host: {
    '[class.btn]': 'true',
    '[class]': 'buttonClass',
  },
})
export class BsButtonTypeDirective {
  buttonClass = 'btn-transparent';
  readonly color = input<Color | undefined>(undefined);

  constructor() {
    effect(() => {
      const value = this.color();
      if (value !== undefined) {
        const name = Color[value];
        this.buttonClass = `btn-${name}`;
      }
    });
  }
}
