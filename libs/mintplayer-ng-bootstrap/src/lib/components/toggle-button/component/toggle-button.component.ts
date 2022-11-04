import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Optional, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { BsToggleButtonGroupDirective } from '..';
import { BsCheckStyle } from '../types/check-style';

@Component({
  selector: 'bs-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss']
})
export class BsToggleButtonComponent implements AfterViewInit {

  constructor() {
    this.mainCheckStyle$ = this.type$.pipe(map((type) => {
      switch (type) {
        case 'checkbox':
        case 'radio':
        case 'switch':
          return 'form-check';
        default:
          return null;
      }
    }));

    this.isSwitch$ = this.type$.pipe(map((type) => {
      switch (type) {
        case 'switch':
          return true;
        default:
          return false;
      }
    }));

    this.inputClass$ = this.type$.pipe(map((type) => {
      switch (type) {
        case 'checkbox':
        case 'radio':
        case 'switch':
          return 'form-check-input';
        default:
          return 'btn-check';
      }
    }));
    
    this.labelClass$ = this.type$.pipe(map((type) => {
      switch (type) {
        case 'checkbox':
        case 'radio':
        case 'switch':
          return 'form-check-label';
        case 'toggle_button':
          return 'btn btn-primary'
        case 'radio_toggle_button':
          return 'btn btn-secondary';
      }
    }));

    this.checkOrRadio$ = this.type$.pipe(map((type) => {
      switch (type) {
        case 'radio':
        case 'radio_toggle_button':
          return 'radio';
        default:
          return 'checkbox';
      }
    }));

    this.nameResult$ = combineLatest([this.name$, this.type$, this.group$])
      .pipe(map(([name, type, group]) => {
        switch (type) {
          case 'radio':
          case 'radio_toggle_button':
              return name;
          case 'checkbox':
          case 'toggle_button':
          case 'switch':
            if (group) {
              return `${name}[]`;
            } else {
              return name;
            }
          default:
            throw 'Invalid value';
        }
      }));
  }

  @ViewChild('checkbox') checkbox!: ElementRef<HTMLInputElement>;

  disableAnimations = true;
  mainCheckStyle$: Observable<string | null>;
  isSwitch$: Observable<boolean>;
  inputClass$: Observable<string>;
  labelClass$: Observable<string>;
  checkOrRadio$: Observable<'checkbox' | 'radio'>;
  nameResult$: Observable<string | null>;

  //#region Type
  type$ = new BehaviorSubject<BsCheckStyle>('checkbox');
  public get type() {
    return this.type$.value;
  }
  @Input() public set type(value: BsCheckStyle) {
    this.type$.next(value);
  }
  //#endregion

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

  //#region disabled
  @Input() public disabled = false;
  //#endregion

  //#region name
  name$ = new BehaviorSubject<string | null>(null);
  public get name() {
    return this.name$.value;
  }
  @Input() public set name(value: string | null) {
    this.name$.next(value);
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

  //#region Group
  group$ = new BehaviorSubject<BsToggleButtonGroupDirective | null>(null);
  public get group() {
    return this.group$.value;
  }
  @Input() public set group(value: BsToggleButtonGroupDirective | null) {
    this.group$.next(value);
  }
  //#endregion

  ngAfterViewInit() {
    this.disableAnimations = false;
  }

}
