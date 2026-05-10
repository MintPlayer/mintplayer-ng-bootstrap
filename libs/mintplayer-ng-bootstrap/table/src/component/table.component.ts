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
  border = input(false);
  /**
   * Forwards `aria-rowcount` onto the wrapped `<table>` element. Used by
   * virtualised consumers (e.g. virtual-datatable) that need SR users to
   * hear "row N of Y" with Y matching the full record set, not the DOM
   * slice. `null` (default) leaves the attribute off entirely.
   */
  ariaRowCount = input<number | null>(null);
}
