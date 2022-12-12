import { Component } from '@angular/core';
import { BsListGroupComponent } from '@mintplayer/ng-bootstrap/list-group';

@Component({
  selector: 'bs-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss'],
  providers: [
    { provide: BsListGroupComponent, useExisting: BsListGroupMockComponent },
  ]
})
export class BsListGroupMockComponent {}
