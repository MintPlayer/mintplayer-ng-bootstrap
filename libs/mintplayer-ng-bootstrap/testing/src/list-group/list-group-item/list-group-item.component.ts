import { Component } from '@angular/core';
import { BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';

@Component({
  selector: 'bs-list-group-item',
  templateUrl: './list-group-item.component.html',
  styleUrls: ['./list-group-item.component.scss'],
  providers: [
    { provide: BsListGroupItemComponent, useExisting: BsListGroupItemMockComponent },
  ]
})
export class BsListGroupItemMockComponent {}
