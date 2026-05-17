import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'bs-card-subtitle',
  template: '<ng-content></ng-content>',
  host: { class: 'card-subtitle' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardSubtitleComponent {}
