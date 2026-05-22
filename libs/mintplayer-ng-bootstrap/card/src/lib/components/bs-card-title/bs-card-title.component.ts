import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  selector: 'bs-card-title',
  template: '<ng-content></ng-content>',
  host: { class: 'card-title' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardTitleComponent {}
