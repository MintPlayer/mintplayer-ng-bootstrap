import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';

@Component({
  selector: 'demo-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss'],
  standalone: true,
  imports: [BsListGroupModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListGroupComponent {}
