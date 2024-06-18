import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BsCheckGroupDirective } from '@mintplayer/ng-bootstrap/check-group';
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
  
  //#region isChecked
  isChecked$ = new BehaviorSubject<boolean | null>(false);
  @Output() public isCheckedChange = new EventEmitter<boolean | null>();
  public get isChecked() {
    return this.isChecked$.value;
  }
  @Input() public set isChecked(value: boolean | null) {
    this.isChecked$.next(value);
    this.isCheckedChange.emit(value);
  }
  //#endregion
  
  //#region isEnabled
  isEnabled$ = new BehaviorSubject<boolean>(true);
  public get isEnabled() {
    return this.isEnabled$.value;
  }
  @Input() public set isEnabled(value: boolean) {
    this.isEnabled$.next(value);
  }
  //#endregion
}
