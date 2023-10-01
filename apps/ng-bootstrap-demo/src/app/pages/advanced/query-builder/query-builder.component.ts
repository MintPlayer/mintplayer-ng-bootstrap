import { Component } from '@angular/core';
import { BsQueryGroup } from '@mintplayer/ng-bootstrap/query-builder';

@Component({
  selector: 'demo-query-builder',
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.scss']
})
export class QueryBuilderComponent {
  data: BsQueryGroup<Item> = {
    operator: 'OR',
    items: []
  };
}

interface Item {
}