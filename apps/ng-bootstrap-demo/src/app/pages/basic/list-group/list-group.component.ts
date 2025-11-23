import { Component } from '@angular/core';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';

@Component({
  selector: 'demo-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss'],
  imports: [BsListGroupComponent, BsListGroupItemComponent]
})
export class ListGroupComponent {}
