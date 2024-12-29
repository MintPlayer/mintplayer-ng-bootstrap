import { Component, ContentChildren, QueryList, ViewEncapsulation } from '@angular/core';
import { BsListGroupItemComponent } from '../list-group-item/list-group-item.component';

@Component({
  selector: 'bs-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.None,
})
export class BsListGroupComponent {
  @ContentChildren(BsListGroupItemComponent) items!: QueryList<BsListGroupItemComponent>;
}
