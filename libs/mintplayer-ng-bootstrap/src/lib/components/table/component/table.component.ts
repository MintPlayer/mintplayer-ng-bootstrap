import { Component, Input } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Component({
  selector: 'bs-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class BsTableComponent {
  constructor() {
  }

  //#region isResponsive
  isResponsive$ = new BehaviorSubject<boolean>(false);
  public get isResponsive() {
    return this.isResponsive$.value;
  }
  @Input() public set isResponsive(value: boolean) {
    this.isResponsive$.next(value);
  }
  //#endregion
  //#region striped
  striped$ = new BehaviorSubject<boolean>(false);
  public get striped() {
    return this.striped$.value;
  }
  @Input() public set striped(value: boolean) {
    this.striped$.next(value);
  }
  //#endregion
  //#region hover
  hover$ = new BehaviorSubject<boolean>(false);
  public get hover() {
    return this.hover$.value;
  }
  @Input() public set hover(value: boolean) {
    this.hover$.next(value);
  }
  //#endregion
}
