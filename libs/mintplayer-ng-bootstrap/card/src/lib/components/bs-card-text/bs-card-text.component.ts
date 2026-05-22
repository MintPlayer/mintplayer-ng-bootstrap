import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  selector: 'bs-card-text',
  template: '<ng-content></ng-content>',
  host: { class: 'card-text' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardTextComponent {}
