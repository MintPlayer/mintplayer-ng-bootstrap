import { Component } from '@angular/core';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';

@Component({
  selector: 'demo-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss'],
  standalone: true,
  imports: [BsListGroupModule]
})
export class ListGroupComponent {}
