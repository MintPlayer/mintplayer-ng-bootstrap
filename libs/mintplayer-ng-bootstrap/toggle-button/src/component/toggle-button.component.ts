import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, Input, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { BsCheckGroupDirective } from '@mintplayer/ng-bootstrap/check-group/src/check-group.directive';

@Component({
  selector: 'bs-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss']
})
export class BsToggleButtonComponent implements AfterViewInit {
  constructor(group?: BsCheckGroupDirective) {
    this.group$.next(group);

    this.nameResult$ = combineLatest([this.group$, this.name$])
      .pipe(map(([group, name]) => group ? `${group.name}[]` : name));
  }
  
  group$ = new BehaviorSubject<BsCheckGroupDirective | undefined>(undefined);
  name$ = new BehaviorSubject<string | undefined>(undefined);
  nameResult$: Observable<string | undefined>;
  @HostBinding('class.d-inline-block') dInlineBlockClass = true;

  disableAnimations = true;

  //#region isToggled
  _isToggled: boolean | null = false;
  @Output() public isToggledChange = new EventEmitter<boolean | null>();
  public get isToggled() {
    return this._isToggled;
  }
  @Input() public set isToggled(value: boolean | null) {
    this._isToggled = value;
    this.isToggledChange.emit(this._isToggled);
  }
  //#endregion

  //#region value
  value$ = new BehaviorSubject<string | null>(null);
  public get value() {
    return this.value$.value;
  }
  @Input() public set value(value: string | null) {
    this.value$.next(value);
  }
  //#endregion

  ngAfterViewInit() {
    this.disableAnimations = false;
  }

}
