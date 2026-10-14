import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'bs-card-group',
  template: '<ng-content></ng-content>',
  // The group wraps cards, so mp-card's card-anchored document sheet cannot
  // reach it (#432); the host is an inline custom element without this.
  styles: ':host { display: block; }',
  host: { class: 'card-group' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardGroupComponent {}
