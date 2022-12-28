import { Component, Input } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'bs-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
})
export class BsIconComponent {
  constructor() {
    this.isVisible$ = this.icon$.pipe(map(i => i !== null));
    this.biClass$ = this.icon$.pipe(map((icon) => {
      if (icon === null) {
        return null;
      } else {
        return `bi-${icon}`;
      }
    }));
  }
  
  icon$ = new BehaviorSubject<string | null>(null);
  isVisible$: Observable<boolean>;
  biClass$: Observable<string | null>;


  public get icon() {
    return this.icon$.value;
  }
  @Input() public set icon(value: string | null) {
    this.icon$.next(value);
  }
}
