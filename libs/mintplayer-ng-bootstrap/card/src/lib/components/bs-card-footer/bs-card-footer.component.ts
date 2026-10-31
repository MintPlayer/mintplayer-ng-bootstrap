import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import { CARD_SCOPE, capColorClasses, cardScopedStyles } from '@mintplayer/ui-core/card';

@Component({
  selector: 'bs-card-footer',
  template: '<ng-content></ng-content>',
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardFooterComponent {
  readonly color = input<Color | undefined>(undefined);

  protected readonly classes = computed(() => {
    const c = this.color();
    return ['card-footer', ...capColorClasses(c === undefined ? null : Color[c])];
  });

  constructor() {
    // Block display of its own (#452), not borrowed from the card's flex.
    useScopedStyles(CARD_SCOPE, cardScopedStyles);
  }
}
