import { contentChildren, Directive, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsRadioComponent } from '../../component/radio.component';

/**
 * Groups N `<bs-radio>` children into a single-select FormControl whose
 * value is the selected radio's `value()`. The group owns the shared
 * `[name]` (radios don't carry their own); the children render with
 * `<input type="radio" name="${group.name}">` so native radio-group
 * semantics (one-of-N) work even without the FormControl layer.
 *
 * Acts as its own `ControlValueAccessor` — bind `[formControl]` /
 * `[(ngModel)]` on the element carrying `[bsRadioGroup]`. Listens to
 * bubbled `(change)` events from the children to compute the new value.
 */
@Directive({
  selector: '[bsRadioGroup]',
  exportAs: 'bsRadioGroup',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsRadioGroupDirective),
    multi: true,
  }],
  host: {
    '(change)': 'onChildChange()',
  },
})
export class BsRadioGroupDirective implements ControlValueAccessor {

  readonly name = input<string | null>(null);
  readonly radios = contentChildren(BsRadioComponent, { descendants: true });

  private onValueChange?: (value: string | null) => void;
  private onTouched?: () => void;

  onChildChange() {
    if (!this.onValueChange) return;
    const selected = this.radios().find(r => !!r.isToggled());
    this.onValueChange(selected?.value() ?? null);
  }

  registerOnChange(fn: (_: string | null) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: string | null) {
    this.radios().forEach(r => r.isToggled.set(r.value() === value));
  }

  setDisabledState(isDisabled: boolean) {
    this.radios().forEach(r => {
      const inputRef = r.checkbox();
      if (inputRef) {
        inputRef.nativeElement.disabled = isDisabled;
      }
    });
  }
}
