import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BsCheckGroupDirective } from '@mintplayer/ng-bootstrap/check-group/src/check-group.directive';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Component({
  selector: 'bs-radio-toggle-button',
  standalone: true,
  imports: [CommonModule, BsFormCheckComponent],
  templateUrl: './radio-toggle-button.component.html',
  styleUrl: './radio-toggle-button.component.scss',
})
export class BsRadioToggleButtonComponent {
  
  constructor(group: BsCheckGroupDirective) {
    this.group$.next(group);
    this.nameResult$ = this.group$.pipe(map(group => group?.name));
  }
  
  group$ = new BehaviorSubject<BsCheckGroupDirective | undefined>(undefined);
  nameResult$: Observable<string | undefined>;

  //#region value
  value$ = new BehaviorSubject<string | null>(null);
  public get value() {
    return this.value$.value;
  }
  @Input() public set value(value: string | null) {
    this.value$.next(value);
  }
  //#endregion
}
