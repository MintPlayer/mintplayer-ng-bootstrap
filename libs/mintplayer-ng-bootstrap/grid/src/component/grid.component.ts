import { AsyncPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';
import { BsContainerComponent } from '@mintplayer/ng-bootstrap/container';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Component({
  selector: 'bs-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  imports: [AsyncPipe, BsContainerComponent],
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
