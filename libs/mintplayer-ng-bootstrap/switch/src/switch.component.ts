import { Component, EventEmitter, HostBinding, Input, Optional, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { BsCheckGroupDirective } from '@mintplayer/ng-bootstrap/check-group';

@Component({
  selector: 'bs-switch',
  standalone: true,
  imports: [CommonModule, BsFormCheckComponent],
  templateUrl: './switch.component.html',
  styleUrl: './switch.component.scss',
})
export class BsSwitchComponent {
  constructor(@Optional() group?: BsCheckGroupDirective) {
    this.group$.next(group);

    this.nameResult$ = combineLatest([this.group$, this.name$])
      .pipe(map(([group, name]) => group ? `${group.name}[]` : name));
  }
  
  group$ = new BehaviorSubject<BsCheckGroupDirective | undefined>(undefined);
  name$ = new BehaviorSubject<string | undefined>(undefined);
  nameResult$: Observable<string | undefined>;
  @HostBinding('class.d-inline-block') dInlineBlockClass = true;

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
  
  //#region isToggled
  isToggled$ = new BehaviorSubject<boolean | null>(false);
  @Output() public isToggledChange = new EventEmitter<boolean | null>();
  public get isToggled() {
    return this.isToggled$.value;
  }
  @Input() public set isToggled(value: boolean | null) {
    this.isToggled$.next(value);
    this.isToggledChange.emit(value);
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
