import { Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BsCheckGroupDirective } from '@mintplayer/ng-bootstrap/check-group/src/check-group.directive';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Component({
  selector: 'bs-radio-button',
  standalone: true,
  imports: [CommonModule, BsFormCheckComponent],
  templateUrl: './radio-button.component.html',
  styleUrl: './radio-button.component.scss',
})
export class BsRadioButtonComponent {
  
  constructor(group: BsCheckGroupDirective) {
    this.group$.next(group);
    this.nameResult$ = this.group$.pipe(map(group => group?.name));
  }
  
  group$ = new BehaviorSubject<BsCheckGroupDirective | undefined>(undefined);
  nameResult$: Observable<string | undefined>;
  @HostBinding('class.d-inline-block') dInlineBlockClass = true;

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
