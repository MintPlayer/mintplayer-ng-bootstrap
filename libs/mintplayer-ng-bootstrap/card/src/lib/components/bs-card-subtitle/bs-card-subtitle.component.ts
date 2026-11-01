import { ChangeDetectionStrategy, Component } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap';

@Component({
  selector: 'bs-card-subtitle',
  template: '<ng-content></ng-content>',
  host: { '[attr.data-mps]': '"card"', class: 'card-subtitle d-block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardSubtitleComponent {
  constructor() {
    // #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
    useBootstrap(bootstrapCard);
  }
}
