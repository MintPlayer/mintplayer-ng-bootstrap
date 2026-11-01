import { ChangeDetectionStrategy, Component } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap';

@Component({
  selector: 'bs-card-text',
  template: '<ng-content></ng-content>',
  host: { '[attr.data-mps]': '"card"', class: 'card-text' },
  // The host is a custom element, inline by default; Bootstrap's card parts need
  // a block box (#452 issue 2). Unlayered, so it beats the layered card part,
  // while Bootstrap's !important display utilities (d-none) still win.
  styles: ':host { display: block; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardTextComponent {
  constructor() {
    // #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
    useBootstrap(bootstrapCard);
  }
}
