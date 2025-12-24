import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bs-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTableComponent {
  isResponsive = input(false);
  striped = input(false);
  hover = input(false);
}
