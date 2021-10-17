import { Component, ContentChildren, OnInit, QueryList } from '@angular/core';
import { BsListGroupItemComponent } from '../list-group-item/list-group-item.component';

@Component({
  selector: 'bs-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss']
})
export class BsListGroupComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }

  @ContentChildren(BsListGroupItemComponent) items!: QueryList<BsListGroupItemComponent>;

}
