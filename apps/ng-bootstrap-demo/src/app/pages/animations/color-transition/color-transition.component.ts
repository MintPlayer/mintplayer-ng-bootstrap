import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorTransitionAnimation } from '@mintplayer/ng-animations';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';

@Component({
  selector: 'demo-color-transition',
  templateUrl: './color-transition.component.html',
  styleUrls: ['./color-transition.component.scss'],
  animations: [ColorTransitionAnimation],
  standalone: true,
  imports: [AsyncPipe, FormsModule, BsCheckboxModule]
})
export class ColorTransitionComponent {

  constructor() {
    this.currentColor$ = this.state$.pipe(map((state) => {
      return state ? 'color1' : 'color2';
    }));
  }

  //#region state
  state$ = new BehaviorSubject<boolean>(false);
  get state() {
    return this.state$.value;
  }
  set state(value: boolean) {
    this.state$.next(value);
  }
  //#endregion

  currentColor$: Observable<'color1' | 'color2'>;
}
