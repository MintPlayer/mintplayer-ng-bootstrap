import { Component, ContentChildren, OnInit, QueryList } from '@angular/core';
import { ListGroupItemComponent } from '../list-group-item/list-group-item.component';

@Component({
  selector: 'bs-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss']
})
export class ListGroupComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }

  @ContentChildren(ListGroupItemComponent) items!: QueryList<ListGroupItemComponent>;

}
