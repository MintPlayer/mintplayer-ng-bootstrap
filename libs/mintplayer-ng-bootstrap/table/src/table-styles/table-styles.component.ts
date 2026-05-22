import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'bs-table-styles',
  template: '<ng-content></ng-content>',
  styleUrls: ['./table-styles.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTableStylesComponent {}
