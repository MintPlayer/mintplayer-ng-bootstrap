import { Component, Input } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Breakpoint } from '../../../types/breakpoint';

@Component({
  selector: 'bs-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
})
export class BsGridComponent {
  
  constructor() {
    this.containerClass$ = this.stopFullWidthAt$.pipe(map((stopFullWidthAt) => {
      switch (stopFullWidthAt) {
        case 'sm': return 'container';
        case 'never': return 'container-fluid';
        default: return `container-${stopFullWidthAt}`;
      }
    }));
  }

  //#region StopFullWidthAt
  stopFullWidthAt$ = new BehaviorSubject<Breakpoint | 'never'>('sm');
  public get stopFullWidthAt() {
    return this.stopFullWidthAt$.value;
  }
  @Input() public set stopFullWidthAt(value: Breakpoint | 'never') {
    this.stopFullWidthAt$.next(value);
  }
  //#endregion

  containerClass$: Observable<string>;
}
