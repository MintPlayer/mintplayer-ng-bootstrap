import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'bs-input-group',
  standalone: true,
  templateUrl: './input-group.component.html',
  styleUrls: ['./input-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsInputGroupComponent {}
