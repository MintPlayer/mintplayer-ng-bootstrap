import { Component, contentChildren, ChangeDetectionStrategy} from '@angular/core';
import { BsListGroupItemComponent } from '../list-group-item/list-group-item.component';

@Component({
  selector: 'bs-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsListGroupComponent {
  readonly items = contentChildren(BsListGroupItemComponent);
}
