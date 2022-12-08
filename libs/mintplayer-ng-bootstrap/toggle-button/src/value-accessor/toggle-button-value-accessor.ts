import { AfterViewInit, Directive, forwardRef, HostListener, OnDestroy, Optional } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { fromEvent, Subject, takeUntil } from 'rxjs';
import { BsToggleButtonComponent } from '../component/toggle-button.component';

@Directive({
  selector: 'bs-toggle-button',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsToggleButtonValueAccessor),
    multi: true,
  }],
})
export class BsToggleButtonValueAccessor implements ControlValueAccessor, AfterViewInit, OnDestroy {
  constructor(private host: BsToggleButtonComponent) {}

  destroyed$ = new Subject();

  onValueChange?: (value: boolean | string | string[]) => void;
  onTouched?: () => void;

  //#region Lifecycle hooks
  ngAfterViewInit() {
    fromEvent(this.host.checkbox.nativeElement, 'change')
      .pipe(takeUntil(this.destroyed$))
      .subscribe((ev) => {
        if (this.onValueChange && this.host.checkbox) {
          const isChecked = (<HTMLInputElement>ev.target).checked;
          switch (this.host.type) {
            case 'radio':
            case 'radio_toggle_button':
              if (isChecked) {
                this.onValueChange(this.host.checkbox.nativeElement.value);
              }
              break;
            default:
              if (this.host['group']) {
                const group = this.host['group'];
                const itemValue = this.host.checkbox.nativeElement.value;
                
                const result = group.toggleButtons
                  .map(tb => ({ value: tb.value, checked: tb.checkbox.nativeElement.checked }))
                  .filter(tb => !!tb.value && tb.checked)
                  .map(tb => <string>tb.value);

                if (this.host.checkbox.nativeElement.checked) {
                  if (!result.includes(itemValue)) {
                    result.push(itemValue);
                  }
                } else {
                  if (result.includes(itemValue)) {
                    result.splice(result.indexOf(itemValue), 1);
                  }
                }

                this.onValueChange(result);
              } else {
                this.onValueChange(isChecked);
              }
              break;
          }
        }
      });
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
  //#endregion

  //#region ControlValueAccessor implementation
  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }
  
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: boolean | string | string[]) {
    if (this.host.checkbox) {
      switch (this.host.type) {
        case 'radio':
        case 'radio_toggle_button':
          if (<string>value === this.host.value) {
            this.host.checkbox.nativeElement.checked = true;
          }
          break;
        default:
          if (this.host.group) {
            this.host.checkbox.nativeElement.checked = (<string[]>value).includes(this.host.value!);
          } else {
            this.host.checkbox.nativeElement.checked = <boolean>value;
          }
          break;
      }
    }
  }

  setDisabledState(isDisabled: boolean) {
    if (this.host.checkbox) {
      this.host.checkbox.nativeElement.disabled = isDisabled;
    }
  }
  //#endregion

}
