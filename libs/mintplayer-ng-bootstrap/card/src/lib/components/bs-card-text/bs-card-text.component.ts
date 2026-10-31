import { ChangeDetectionStrategy, Component } from '@angular/core';
import { useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import { CARD_SCOPE, cardScopedStyles } from '@mintplayer/ui-core/card';

@Component({
  selector: 'bs-card-text',
  template: '<ng-content></ng-content>',
  host: { class: 'card-text' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardTextComponent {
  constructor() {
    // Block display from the layered card sheet (#452), not a d-block utility,
    // so a consumer's d-* or own CSS overrides it without an !important fight.
    useScopedStyles(CARD_SCOPE, cardScopedStyles);
  }
}
