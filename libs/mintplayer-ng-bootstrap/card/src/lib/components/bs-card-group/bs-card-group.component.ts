import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Card group. No host `display` of its own: Bootstrap's `.card-group` turns
 * flex from `sm` up, and an unlayered component rule would out-rank the
 * layered baseline and keep it a block (PRD #437 C3).
 */
@Component({
  selector: 'bs-card-group',
  template: '<ng-content></ng-content>',
  host: { class: 'card-group' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardGroupComponent {}
