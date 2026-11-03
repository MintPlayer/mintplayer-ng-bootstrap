import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';
import { Color } from '@mintplayer/ng-bootstrap';
import { capColorClasses } from '@mintplayer/ui-core/card';

/**
 * Card header. A nav inside it takes Bootstrap's own `card-header-tabs` or
 * `card-header-pills` class, written by the consumer on the nav (the old
 * `navStyle` input walked and mutated consumer DOM, which a headless front
 * never does).
 */
@Component({
  selector: 'bs-card-header',
  template: '<ng-content></ng-content>',
  host: { '[attr.data-mps]': '"card"', '[class]': 'classes()' },
  // The host is a custom element, inline by default; Bootstrap's card parts need
  // a block box (#452 issue 2). Unlayered, so it beats the layered card part,
  // while Bootstrap's !important display utilities (d-none) still win.
  styles: ':host { display: block; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardHeaderComponent {
  constructor() {
    // #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
    useBootstrap(bootstrapCard);
  }

  readonly color = input<Color | undefined>(undefined);

  protected readonly classes = computed(() => {
    const c = this.color();
    return ['card-header', ...capColorClasses(c === undefined ? null : Color[c])];
  });
}
