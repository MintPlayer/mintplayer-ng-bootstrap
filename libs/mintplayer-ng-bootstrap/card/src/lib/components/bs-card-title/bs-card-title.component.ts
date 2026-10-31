import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import { CARD_SCOPE, cardScopedStyles } from '@mintplayer/ui-core/card';

@Component({
  selector: 'bs-card-title',
  // role=heading + aria-level rather than swapping real h1-h6 tags: the tag
  // cannot change dynamically without destroying projected content, and the
  // computed pair is exactly equivalent in the accessibility tree.
  template: '<ng-content></ng-content>',
  host: {
    class: 'card-title',
    role: 'heading',
    '[attr.aria-level]': 'level()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardTitleComponent {
  /** Heading level in the page outline. Cards default to a section-level 5, matching Bootstrap's visual h5. */
  readonly level = input(5);

  constructor() {
    // The host is a custom element, inline by default, and the title's margin
    // needs a block box. The layered card sheet supplies it (#452) rather than
    // a d-block utility, whose !important would fight a consumer's d-*.
    useScopedStyles(CARD_SCOPE, cardScopedStyles);
  }
}
