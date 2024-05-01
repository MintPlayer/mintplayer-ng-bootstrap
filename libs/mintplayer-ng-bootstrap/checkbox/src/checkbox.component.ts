import { Component, ElementRef, EventEmitter, HostBinding, Input, Optional, Output, ViewChild } from '@angular/core';
import { BsCheckGroupDirective } from '@mintplayer/ng-bootstrap/check-group';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

@Component({
  selector: 'bs-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
})
export class BsCheckboxComponent {
  constructor(@Optional() group?: BsCheckGroupDirective) {
    this.group$.next(group);

    this.nameResult$ = combineLatest([this.group$, this.name$])
      .pipe(map(([group, name]) => group ? `${group.name}[]` : name));
  }
  
  group$ = new BehaviorSubject<BsCheckGroupDirective | undefined>(undefined);
  name$ = new BehaviorSubject<string | undefined>(undefined);
  nameResult$: Observable<string | undefined>;
  @HostBinding('class.d-inline-block') dInlineBlockClass = true;
  @ViewChild('checkbox') checkbox!: ElementRef<HTMLInputElement>;

  @Input() public set name(value: string | undefined) {
    this.name$.next(value);
  }

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
