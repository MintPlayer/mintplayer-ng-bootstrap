import { AsyncPipe } from '@angular/common';
import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Component({
  selector: 'bs-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [AsyncPipe],
})
export class BsSpinnerComponent implements OnInit {
  constructor() {
    this.spinnerClass$ = this.type$
      .pipe(map((type) => `spinner-${type}`));
    this.colorClass$ = this.color$
      .pipe(map((type) => `text-${this.colors[type]}`));
  }

  spinnerClass$: Observable<string>;
  colorClass$: Observable<string>;
  colors = Color;

  ngOnInit(): void {}

  //#region Type
  type$ = new BehaviorSubject<'border' | 'grow'>('border');
  public get type() {
    return this.type$.value;
  }
  @Input() public set type(value: 'border' | 'grow') {
    this.type$.next(value);
  }
  //#endregion
  //#region Color
  color$ = new BehaviorSubject<Color>(Color.dark);
  public get color() {
    return this.color$.value;
  }
  @Input() public set color(value: Color) {
    this.color$.next(value);
  }
  //#endregion
}
