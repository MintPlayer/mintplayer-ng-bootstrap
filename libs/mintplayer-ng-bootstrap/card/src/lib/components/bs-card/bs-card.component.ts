import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { applyCardColorClasses, ensureCardStylesInjected } from '@mintplayer/web-components/card';

/**
 * Angular wrapper for the Bootstrap card root.
 *
 * The wrapper applies `.card` (+ optional colour/outline classes) directly to
 * its own host element rather than rendering an inner `<mp-card>`. This keeps
 * Bootstrap's parent-child selectors (`.card > .card-header`, `.card > .list-
 * group + .card-footer`) matching when sibling Angular wrappers like
 * `<bs-card-header>` sit underneath. The Lit `mp-card` element registers as
 * a side-effect import — direct WC consumers still work, but Angular
 * templates use `<bs-card>` instead of `<mp-card>` to avoid the extra
 * nesting level.
 */
@Component({
  selector: 'bs-card',
  template: '<ng-content></ng-content>',
  host: { class: 'card' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardComponent {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly color = input<Color | undefined>(undefined);
  readonly outline = input(false);

  constructor() {
    ensureCardStylesInjected();
    effect(() => {
      const c = this.color();
      const name = c === undefined ? null : Color[c];
      applyCardColorClasses(this.el.nativeElement, name, this.outline());
    });
  }
}
