import { Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Color } from '../../enums';

@Component({
  selector: 'bs-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
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
  public set color(value: Color) {
    this.color$.next(value);
  }
  //#endregion
}
