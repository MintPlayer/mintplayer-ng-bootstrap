import { AsyncPipe } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, EventEmitter, HostBinding, Input, Optional, Output, ViewChild, forwardRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsCheckGroupDirective } from '@mintplayer/ng-bootstrap/check-group';
import { BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BsLetDirective } from '@mintplayer/ng-bootstrap/let';
import { BehaviorSubject, Observable, combineLatest, fromEvent, map } from 'rxjs';

@Component({
  selector: 'bs-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
  standalone: true,
  imports: [AsyncPipe, BsFormCheckComponent, BsLetDirective],
  providers: [{
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BsCheckboxComponent),
      multi: true,
  }],
})
export class BsCheckboxComponent implements AfterViewInit, ControlValueAccessor {
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

  ngAfterViewInit() {
    fromEvent(this.checkboxElement.nativeElement, 'change')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((ev) => {
        if (this.onValueChange) {
          const isChecked = (<HTMLInputElement>ev.target).checked;
          this.onValueChange(isChecked);
        }
      });
  }

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
    this.isChecked$.next(value);
  }

  setDisabledState(isDisabled: boolean) {
    this.isEnabled$.next(!isDisabled);
  }
  //#endregion
}
