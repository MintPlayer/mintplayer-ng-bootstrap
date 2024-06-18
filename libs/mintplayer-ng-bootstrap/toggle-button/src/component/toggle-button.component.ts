import { AfterViewInit, Component, DestroyRef, ElementRef, EventEmitter, HostBinding, Input, Optional, Output, ViewChild, forwardRef } from '@angular/core';
import { BehaviorSubject, combineLatest, fromEvent, map, Observable } from 'rxjs';
import { BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BsCheckGroupDirective } from '@mintplayer/ng-bootstrap/check-group';
import { AsyncPipe } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'bs-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  standalone: true,
  imports: [AsyncPipe, BsFormCheckComponent],
  providers: [{
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BsToggleButtonComponent),
      multi: true,
  }],
})
export class BsToggleButtonComponent implements AfterViewInit, ControlValueAccessor {
  constructor(private destroy: DestroyRef, @Optional() group?: BsCheckGroupDirective) {
    this.group$.next(group);

    this.nameResult$ = combineLatest([this.group$, this.name$])
      .pipe(map(([group, name]) => group ? `${group.name}[]` : name));
  }
  
  group$ = new BehaviorSubject<BsCheckGroupDirective | undefined>(undefined);
  name$ = new BehaviorSubject<string | undefined>(undefined);
  nameResult$: Observable<string | undefined>;
  @HostBinding('class.d-inline-block') dInlineBlockClass = true;
  @ViewChild('checkbox') checkboxElement!: ElementRef<HTMLInputElement>;

  disableAnimations = true;

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

  //#region value
  value$ = new BehaviorSubject<string | null>(null);
  public get value() {
    return this.value$.value;
  }
  @Input() public set value(value: string | null) {
    this.value$.next(value);
  }
  //#endregion

  //#region ValueAccessor implementation
  onValueChange?: (value: boolean | string | string[]) => void;
  onTouched?: () => void;

  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }
  
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: boolean | null) {
    this.isToggled$.next(value);
  }

  setDisabledState(isDisabled: boolean) {
    this.isEnabled$.next(!isDisabled);
  }
  //#endregion

  ngAfterViewInit() {
    this.disableAnimations = false;
    fromEvent(this.checkboxElement.nativeElement, 'change')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((ev) => {
        if (this.onValueChange) {
          const isChecked = (<HTMLInputElement>ev.target).checked;
          this.onValueChange(isChecked);
        }
      });
  }

}
