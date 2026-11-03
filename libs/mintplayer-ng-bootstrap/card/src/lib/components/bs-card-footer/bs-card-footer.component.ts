import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';
import { Color } from '@mintplayer/ng-bootstrap';
import { capColorClasses } from '@mintplayer/ui-core/card';

@Component({
  selector: 'bs-card-footer',
  template: '<ng-content></ng-content>',
  host: { '[attr.data-mps]': '"card"', '[class]': 'classes()' },
  // The host is a custom element, inline by default; Bootstrap's card parts need
  // a block box (#452 issue 2). Unlayered, so it beats the layered card part,
  // while Bootstrap's !important display utilities (d-none) still win.
  styles: ':host { display: block; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardFooterComponent {
  constructor() {
    // #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
    useBootstrap(bootstrapCard);
  }

  readonly color = input<Color | undefined>(undefined);

  protected readonly classes = computed(() => {
    const c = this.color();
    return ['card-footer', ...capColorClasses(c === undefined ? null : Color[c])];
  });
}
