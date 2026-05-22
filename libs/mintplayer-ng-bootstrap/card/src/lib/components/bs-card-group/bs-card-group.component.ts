import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  selector: 'bs-card-group',
  template: '<ng-content></ng-content>',
  host: { class: 'card-group' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardGroupComponent {}
