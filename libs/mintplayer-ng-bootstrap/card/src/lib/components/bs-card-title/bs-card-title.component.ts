import { ChangeDetectionStrategy, Component, input } from '@angular/core';

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
}
