import { Component, Input, ViewEncapsulation } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Color } from '@mintplayer/ng-bootstrap';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'bs-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [AsyncPipe]
})
export class BsBadgeComponent {
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
}
