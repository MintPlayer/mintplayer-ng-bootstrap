import { Component, Input } from '@angular/core';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';

@Component({
  selector: 'bs-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  providers: [
    { provide: BsTableComponent, useExisting: BsTableMockComponent },
  ]
})
export class BsTableMockComponent {
  @Input() isResponsive = false;
  @Input() striped = false;
  @Input() hover = false;
}
