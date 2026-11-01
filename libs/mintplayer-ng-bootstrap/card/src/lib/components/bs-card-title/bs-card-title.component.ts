import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap';

@Component({
  selector: 'bs-card-title',
  // role=heading + aria-level rather than swapping real h1-h6 tags: the tag
  // cannot change dynamically without destroying projected content, and the
  // computed pair is exactly equivalent in the accessibility tree.
  template: '<ng-content></ng-content>',
  host: {
    '[attr.data-mps]': '"card"',
    // d-block: the host is a custom element, inline by default, and the
    // title's margin needs a block box.
    class: 'card-title d-block',
    role: 'heading',
    '[attr.aria-level]': 'level()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardTitleComponent {
  constructor() {
    // #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
    useBootstrap(bootstrapCard);
  }

  /** Heading level in the page outline. Cards default to a section-level 5, matching Bootstrap's visual h5. */
  readonly level = input(5);
}
