import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { cardColorClasses } from '@mintplayer/ui-core/card';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap';

/**
 * The card root (PRD #437 wave A). The host IS the Bootstrap `.card`: no
 * inner element and no core, so the server renders the finished card and the
 * page baseline styles it with JS off. Projected `<bs-card-*>` children are
 * plain class-carrying elements.
 */
@Component({
  selector: 'bs-card',
  template: '<ng-content></ng-content>',
  styleUrls: ['./bs-card.component.scss'],
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardComponent {
  constructor() {
    useBootstrap(bootstrapCard);
  }

  readonly color = input<Color | undefined>(undefined);
  readonly outline = input(false);

  protected readonly classes = computed(() => {
    const c = this.color();
    return ['card', ...cardColorClasses(c === undefined ? null : Color[c], this.outline())];
  });
}
