import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BsTableStylesComponent } from '../table-styles/table-styles.component';

@Component({
  selector: 'bs-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  imports: [BsTableStylesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTableComponent {
  isResponsive = input(false);
  striped = input(false);
  hover = input(false);
}
