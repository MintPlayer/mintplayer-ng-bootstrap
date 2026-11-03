import { ChangeDetectionStrategy, Component } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';

/**
 * Card body — explicit wrapper. No auto-padding workaround like the previous
 * implementation: Bootstrap's `.card-body` padding applies as upstream
 * specifies. Consumers wanting unpadded content can use a raw `<div>` inside
 * `<bs-card>` instead.
 */
@Component({
  selector: 'bs-card-body',
  template: '<ng-content></ng-content>',
  host: { '[attr.data-mps]': '"card"', class: 'card-body' },
  // The host is a custom element, inline by default; Bootstrap's card parts need
  // a block box (#452 issue 2). Unlayered, so it beats the layered card part,
  // while Bootstrap's !important display utilities (d-none) still win.
  styles: ':host { display: block; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardBodyComponent {
  constructor() {
    // #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
    useBootstrap(bootstrapCard);
  }
}
