import { ChangeDetectionStrategy, Component } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap';

/**
 * Card group. No host `display` of its own: Bootstrap's `.card-group` turns
 * flex from `sm` up, and an unlayered component rule would out-rank the
 * layered card part and keep it a block (PRD #452 C3).
 */
@Component({
  selector: 'bs-card-group',
  template: '<ng-content></ng-content>',
  host: { '[attr.data-mps]': '"card"', class: 'card-group' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardGroupComponent {
  constructor() {
    // #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
    useBootstrap(bootstrapCard);
  }
}
