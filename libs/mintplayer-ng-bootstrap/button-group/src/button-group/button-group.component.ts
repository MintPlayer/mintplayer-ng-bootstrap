import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'bs-button-group',
  templateUrl: './button-group.component.html',
  styleUrls: ['./button-group.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsButtonGroupComponent {}
