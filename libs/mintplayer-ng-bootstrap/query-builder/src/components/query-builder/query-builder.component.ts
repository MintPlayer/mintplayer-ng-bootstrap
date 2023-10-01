import { Component, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsQueryGroup } from '../../data/group';

@Component({
  selector: 'bs-query-builder',
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.scss'],
})
export class BsQueryBuilderComponent<TData> {
  data$ = new BehaviorSubject<BsQueryGroup<TData>>({ operator: 'OR', items: [] });

  @Input() public set data(value: BsQueryGroup<TData>) {
    this.data$.next(value);
  }
}
