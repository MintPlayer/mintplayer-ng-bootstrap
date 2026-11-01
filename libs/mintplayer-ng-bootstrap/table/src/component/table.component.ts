import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapTables } from '@mintplayer/ui-core/bootstrap';

@Component({
  selector: 'bs-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTableComponent {
  constructor() {
    // #452: the tables partial ships with the table, scoped to its stamped <table>.
    useBootstrap(bootstrapTables);
  }

  isResponsive = input(false);
  striped = input(false);
  hover = input(false);
  border = input(false);
  /**
   * Forwards `aria-rowcount` onto the wrapped `<table>` element. Used by
   * virtualised consumers that need SR users to hear "row N of Y" with Y matching the full
   * record set, not the DOM slice. `null` (default) leaves the attribute
   * off entirely.
   */
  ariaRowCount = input<number | null>(null);
}
