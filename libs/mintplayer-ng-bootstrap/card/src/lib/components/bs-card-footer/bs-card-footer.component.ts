import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { applyTextBgClass } from '@mintplayer/web-components/card';
@Component({
  selector: 'bs-card-footer',
  template: '<ng-content></ng-content>',
  host: { class: 'card-footer' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardFooterComponent {
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
