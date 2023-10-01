import { Component, Input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BehaviorSubject } from 'rxjs';
import { BsQueryGroup } from '../../data/group';
import { BsQueryRule } from '../../data/rule';

@Component({
  selector: 'bs-query-item-renderer',
  templateUrl: './query-item-renderer.component.html',
  styleUrls: ['./query-item-renderer.component.scss'],
})
export class BsQueryItemRendererComponent<TData> {
  colors = Color;

  ruleOrGroup$ = new BehaviorSubject<BsQueryRule<TData> | BsQueryGroup<TData> | null>({ operator: 'AND', items: [] });
  @Input() public set ruleOrGroup(value: BsQueryRule<TData> | BsQueryGroup<TData> | null) {
    this.ruleOrGroup$.next(value);
  }
}
