import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';
import { Color } from '@mintplayer/ng-bootstrap';
import { cardColorClasses } from '@mintplayer/ui-core/card';

/**
 * The card root (PRD #437 wave A). The host IS the Bootstrap `.card`: no
 * inner element and no core, so the server renders the finished card and the
 * card part this component installs (#452) styles it with JS off. Projected
 * `<bs-card-*>` children are plain class-carrying elements, each stamped
 * `data-mps="card"` so the scoped part matches them.
 */
@Component({
  selector: 'bs-card',
  template: '<ng-content></ng-content>',
  host: { '[attr.data-mps]': '"card"', '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardComponent {
  constructor() {
    // #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
    useBootstrap(bootstrapCard);
  }

  readonly color = input<Color | undefined>(undefined);
  readonly outline = input(false);

  protected readonly classes = computed(() => {
    const c = this.color();
    return ['card', ...cardColorClasses(c === undefined ? null : Color[c], this.outline())];
  });
}
