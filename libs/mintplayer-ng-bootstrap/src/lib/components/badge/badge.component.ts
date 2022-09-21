import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Color } from '../../enums';

@Component({
  selector: 'bs-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
})
export class BsBadgeComponent implements OnInit {
  constructor() {
    this.colorClass$ = this.type$
      .pipe(map((type) => `bg-${this.colors[type]}`));
  }

  colors = Color;

  //#region Type
  type$ = new BehaviorSubject<Color>(Color.primary);
  public get type() {
    return this.type$.value;
  }
  @Input() public set type(value: Color) {
    this.type$.next(value);
  }
  //#endregion

  colorClass$: Observable<string>;

  ngOnInit(): void {}

  // @HostBinding('class.badge') badgeCls = true;
  // @HostBinding('class') get typeClass() {
  //   return `bg-${this.colors[this.type]}`;
  // }
}
