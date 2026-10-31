import { ChangeDetectionStrategy, Component } from '@angular/core';
import { useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import { CARD_SCOPE, cardScopedStyles } from '@mintplayer/ui-core/card';

/**
 * Card body — explicit wrapper. No auto-padding workaround like the previous
 * implementation: Bootstrap's `.card-body` padding applies as upstream
 * specifies. Consumers wanting unpadded content can use a raw `<div>` inside
 * `<bs-card>` instead.
 *
 * The card sheet gives the host its own block display (#452): without it the
 * custom element is inline whenever the card is not flex, and its vertical
 * padding stops taking up space.
 */
@Component({
  selector: 'bs-card-body',
  template: '<ng-content></ng-content>',
  host: { class: 'card-body' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardBodyComponent {
  constructor() {
    useScopedStyles(CARD_SCOPE, cardScopedStyles);
  }
}
