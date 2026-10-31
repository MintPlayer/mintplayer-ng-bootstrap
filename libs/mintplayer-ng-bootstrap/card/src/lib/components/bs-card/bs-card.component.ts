import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import { CARD_SCOPE, cardColorClasses, cardScopedStyles } from '@mintplayer/ui-core/card';

/**
 * The card root (PRD #437 wave A). The host IS the Bootstrap `.card`: no
 * inner element and no core, so the server renders the finished card and the
 * page baseline styles it with JS off. Projected `<bs-card-*>` children are
 * plain class-carrying elements.
 */
@Component({
  selector: 'bs-card',
  template: '<ng-content></ng-content>',
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardComponent {
  readonly color = input<Color | undefined>(undefined);
  readonly outline = input(false);

  protected readonly classes = computed(() => {
    const c = this.color();
    return ['card', ...cardColorClasses(c === undefined ? null : Color[c], this.outline())];
  });

  constructor() {
    // The card sheet also styles a <bs-list-group> child, which installs
    // nothing of the card's own: the card installs it too (#452).
    useScopedStyles(CARD_SCOPE, cardScopedStyles);
  }
}
