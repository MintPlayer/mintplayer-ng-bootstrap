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
    class: 'card-title',
    role: 'heading',
    '[attr.aria-level]': 'level()',
  },
  // The host is a custom element, inline by default; Bootstrap's card parts need
  // a block box (#452 issue 2). Unlayered, so it beats the layered card part,
  // while Bootstrap's !important display utilities (d-none) still win.
  styles: ':host { display: block; }',
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
