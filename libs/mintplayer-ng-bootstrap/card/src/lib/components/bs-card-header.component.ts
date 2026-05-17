import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { applyTextBgClass } from '../web-components/card-classes';

/**
 * Angular wrapper for the card header. `[navStyle]` is added in M3 (header
 * tabs / pills); this milestone wires only `[color]`.
 */
@Component({
  selector: 'bs-card-header',
  template: '<ng-content></ng-content>',
  host: { class: 'card-header' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardHeaderComponent {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly color = input<Color | undefined>(undefined);

  constructor() {
    effect(() => {
      const c = this.color();
      const name = c === undefined ? null : Color[c];
      applyTextBgClass(this.el.nativeElement, name);
    });
  }
}
